import { getOpenAI, OPENAI_MODEL } from "./openai";

export interface IssueRecord {
  issue: string;
  resolution: string;
  category?: string | null;
  type?: string | null;
  status?: string | null;
}

export interface AnalysisInsights {
  executiveSummary: string;
  keyThemes: { theme: string; description: string }[];
  rootCauses: { cause: string; description: string }[];
  recommendations: string[];
  riskAreas: { area: string; severity: "High" | "Medium" | "Low"; note: string }[];
}

const SYSTEM_PROMPT = `You are a senior delivery analyst reviewing a support/issue log for a large enterprise project. You are given a list of issues and their resolutions (with optional category, type and status). Produce a concise, management-level QUALITATIVE analysis of the ISSUE and RESOLUTION text — focus on patterns, themes and root causes, not just counts.

Return STRICT JSON with this exact shape:
{
  "executiveSummary": string,            // 3-5 sentences: what is the team dealing with, overall health, where time is going
  "keyThemes": [ { "theme": string, "description": string } ],   // 3-6 recurring themes seen across the issues
  "rootCauses": [ { "cause": string, "description": string } ],  // 3-6 underlying root causes inferred from the resolutions
  "recommendations": [ string ],         // 3-6 specific, actionable recommendations a manager could act on
  "riskAreas": [ { "area": string, "severity": "High" | "Medium" | "Low", "note": string } ]  // 2-5 areas needing attention
}

Be specific and reference the actual subject matter (systems, modules, data, processes) found in the text. Do not invent data. Keep each description to 1-2 sentences.`;

export async function generateAnalysis(records: IssueRecord[]): Promise<AnalysisInsights | null> {
  if (records.length === 0) return null;

  // Keep the prompt bounded; a few hundred issues still fit, but cap defensively.
  const capped = records.slice(0, 200);
  const transcript = capped
    .map((r, i) => {
      const meta = [r.category, r.type, r.status].filter(Boolean).join(" / ");
      return `${i + 1}. ${meta ? `[${meta}] ` : ""}Issue: ${r.issue}\n   Resolution: ${r.resolution}`;
    })
    .join("\n");

  try {
    const openai = getOpenAI();
    const completion = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      temperature: 0.3,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `Here are ${capped.length} issues and resolutions:\n\n${transcript}\n\nProduce the analysis JSON.` },
      ],
    });

    const raw = completion.choices[0]?.message?.content || "{}";
    const parsed = JSON.parse(raw) as AnalysisInsights;
    return parsed;
  } catch (err) {
    console.error("Failed to generate analysis", err);
    return null;
  }
}
