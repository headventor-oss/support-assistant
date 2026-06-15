import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getPool } from "./_lib/db";
import { generateAnalysis, type IssueRecord } from "./_lib/analyze";

interface AnalysisEntryRow {
  question: string;
  answer: string;
  category: string | null;
  issue_type: string | null;
  status: string | null;
  issue_date: string | null;
  resolution_date: string | null;
  eta: string | null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const pool = getPool();

  const datasetResult = await pool.query(
    "SELECT id, name, analysis FROM datasets WHERE is_active = TRUE LIMIT 1"
  );

  if (datasetResult.rows.length === 0) {
    return res
      .status(200)
      .json({ hasActive: false, datasetName: null, hasAnalytics: false, analysis: null, entries: [] });
  }

  const datasetId = datasetResult.rows[0].id;
  const datasetName = datasetResult.rows[0].name;

  let analysis = null;
  if (datasetResult.rows[0].analysis) {
    try {
      analysis = JSON.parse(datasetResult.rows[0].analysis);
    } catch {
      analysis = null;
    }
  }

  const result = await pool.query<AnalysisEntryRow>(
    `SELECT question, answer, category, issue_type, status, issue_date, resolution_date, eta
     FROM qa_entries WHERE dataset_id = $1`,
    [datasetId]
  );

  const entries = result.rows.map((r) => ({
    category: r.category,
    type: r.issue_type,
    status: r.status,
    issueDate: r.issue_date,
    resolutionDate: r.resolution_date,
    eta: r.eta,
  }));

  const hasAnalytics = entries.some((e) => e.issueDate || e.type || e.status);

  // Generate the textual analysis once (lazily, on first view) and cache it.
  if (!analysis && result.rows.length > 0) {
    const records: IssueRecord[] = result.rows.map((r) => ({
      issue: r.question,
      resolution: r.answer,
      category: r.category,
      type: r.issue_type,
      status: r.status,
    }));
    analysis = await generateAnalysis(records);
    if (analysis) {
      await pool.query("UPDATE datasets SET analysis = $1 WHERE id = $2", [
        JSON.stringify(analysis),
        datasetId,
      ]);
    }
  }

  return res.status(200).json({ hasActive: true, datasetName, hasAnalytics, analysis, entries });
}
