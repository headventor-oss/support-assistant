import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getOpenAI, OPENAI_MODEL } from "./_lib/openai";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

function buildTranscript(conversation: ChatMessage[]): string {
  return conversation
    .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
    .join("\n");
}

function generateTicketId(): string {
  const time = Date.now().toString(36).toUpperCase().slice(-5);
  const rand = Math.random().toString(36).slice(2, 5).toUpperCase();
  return `CB-${time}-${rand}`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const body = req.body as {
    summarize?: boolean;
    conversation?: ChatMessage[];
    query?: string;
    name?: string;
    email?: string;
    description?: string;
  };

  const conversation = Array.isArray(body?.conversation) ? body.conversation : [];

  // Mode 1: summarize the whole conversation into a ticket description.
  if (body?.summarize) {
    if (conversation.length === 0 && !body.query) {
      return res.status(400).json({ error: "conversation is required" });
    }

    const transcript = conversation.length > 0 ? buildTranscript(conversation) : `User: ${body.query}`;

    try {
      const openai = getOpenAI();
      const completion = await openai.chat.completions.create({
        model: OPENAI_MODEL,
        temperature: 0.3,
        messages: [
          {
            role: "system",
            content:
              "You write concise support ticket descriptions. Given a conversation between a user and a support assistant, summarize the user's underlying issue into a clear, self-contained ticket description of 3-6 sentences. Write objectively about the problem, include any specific error messages, systems or modules mentioned, and note what the assistant already suggested or what was tried. Do not add a greeting, sign-off, or ticket ID.",
          },
          {
            role: "user",
            content: `Conversation:\n${transcript}\n\nWrite the support ticket description.`,
          },
        ],
      });

      const summary = completion.choices[0]?.message?.content?.trim() || "";
      return res.status(200).json({ summary });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Failed to summarize conversation" });
    }
  }

  // Mode 2: create the ticket. For now we don't send email — just return a unique id.
  const ticketId = generateTicketId();
  console.log(`[ticket] Created ${ticketId}`, {
    name: body.name,
    email: body.email,
    description: body.description,
  });

  return res.status(200).json({ success: true, ticketId });
}
