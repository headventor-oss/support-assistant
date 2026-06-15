import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getPool, type QaEntryRow } from "./_lib/db.js";
import { getOpenAI, OPENAI_MODEL } from "./_lib/openai.js";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const SYSTEM_PROMPT = `You are the CodersBrain support assistant. You help users by answering questions using ONLY the knowledge base entries provided below. Each entry has a Category, Question and Answer.

Instructions:
- Compare the user's message to the knowledge base entries and find the entry/entries that best address it, even if the wording differs (paraphrases, typos, synonyms are fine).
- If you find relevant entries, write a clear, concise, summarized answer based on their content. Do not invent information that isn't supported by the knowledge base.
- If NONE of the entries are sufficiently relevant to answer the user's message, you MUST respond with found=false and a short, friendly message acknowledging you don't have an answer and that the user can raise a support ticket.
- Always respond with strict JSON: {"answer": string, "found": boolean}.`;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { message, history } = req.body as { message: string; history?: ChatMessage[] };
  if (!message || typeof message !== "string") {
    return res.status(400).json({ error: "message is required" });
  }

  const pool = getPool();

  const datasetResult = await pool.query(
    "SELECT id FROM datasets WHERE is_active = TRUE LIMIT 1"
  );

  if (datasetResult.rows.length === 0) {
    return res.status(200).json({
      answer:
        "I don't have a knowledge base to search yet. Please raise a support ticket and our team will help you out.",
      found: false,
    });
  }

  const datasetId = datasetResult.rows[0].id;
  const entriesResult = await pool.query<QaEntryRow>(
    "SELECT question, answer, category FROM qa_entries WHERE dataset_id = $1",
    [datasetId]
  );

  const knowledgeBase = entriesResult.rows
    .map(
      (e, i) =>
        `[${i + 1}] Category: ${e.category || "General"}\nQuestion: ${e.question}\nAnswer: ${e.answer}`
    )
    .join("\n\n");

  const openai = getOpenAI();
  const messages: { role: "system" | "user" | "assistant"; content: string }[] = [
    { role: "system", content: `${SYSTEM_PROMPT}\n\nKnowledge base:\n${knowledgeBase}` },
  ];

  if (Array.isArray(history)) {
    for (const m of history.slice(-10)) {
      if (m.role === "user" || m.role === "assistant") {
        messages.push({ role: m.role, content: m.content });
      }
    }
  }
  messages.push({ role: "user", content: message });

  try {
    const completion = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages,
      response_format: { type: "json_object" },
      temperature: 0.2,
    });

    const raw = completion.choices[0]?.message?.content || "{}";
    let parsed: { answer?: string; found?: boolean };
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = { answer: raw, found: false };
    }

    return res.status(200).json({
      answer: parsed.answer || "I'm not sure how to help with that. You can raise a support ticket.",
      found: Boolean(parsed.found),
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to get a response from the assistant" });
  }
}
