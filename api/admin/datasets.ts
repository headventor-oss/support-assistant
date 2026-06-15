import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getPool } from "../_lib/db";

interface SaveDatasetBody {
  name: string;
  questionCol: string;
  answerCol: string;
  categoryCol?: string;
  dateCol?: string;
  typeCol?: string;
  statusCol?: string;
  resolutionDateCol?: string;
  etaCol?: string;
  rows: Record<string, unknown>[];
}

function cell(row: Record<string, unknown>, col?: string): string | null {
  if (!col) return null;
  const v = row[col];
  if (v == null || String(v).trim() === "") return null;
  return String(v).trim();
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const pool = getPool();

  if (req.method === "GET") {
    interface DatasetSummaryRow {
      id: number;
      name: string;
      version: number;
      question_col: string;
      answer_col: string;
      category_col: string | null;
      is_active: boolean;
      created_at: string;
      entry_count: string;
    }

    const { rows } = await pool.query<DatasetSummaryRow>(`
      SELECT d.id, d.name, d.version, d.question_col, d.answer_col, d.category_col,
             d.is_active, d.created_at, COUNT(q.id) AS entry_count
      FROM datasets d
      LEFT JOIN qa_entries q ON q.dataset_id = d.id
      GROUP BY d.id
      ORDER BY d.created_at DESC
    `);
    return res.status(200).json(
      rows.map((r) => ({
        id: r.id,
        name: r.name,
        version: r.version,
        questionCol: r.question_col,
        answerCol: r.answer_col,
        categoryCol: r.category_col,
        isActive: r.is_active,
        createdAt: r.created_at,
        entryCount: Number(r.entry_count),
      }))
    );
  }

  if (req.method === "POST") {
    const body = req.body as SaveDatasetBody;
    if (!body?.name || !body?.questionCol || !body?.answerCol || !Array.isArray(body.rows)) {
      return res.status(400).json({ error: "name, questionCol, answerCol and rows are required" });
    }
    if (body.rows.length === 0) {
      return res.status(400).json({ error: "rows cannot be empty" });
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const versionResult = await client.query(
        "SELECT COALESCE(MAX(version), 0) + 1 AS next_version FROM datasets WHERE name = $1",
        [body.name]
      );
      const nextVersion = versionResult.rows[0].next_version;

      const datasetResult = await client.query(
        `INSERT INTO datasets
           (name, version, question_col, answer_col, category_col,
            date_col, type_col, status_col, resolution_date_col, eta_col, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, FALSE) RETURNING id`,
        [
          body.name,
          nextVersion,
          body.questionCol,
          body.answerCol,
          body.categoryCol || null,
          body.dateCol || null,
          body.typeCol || null,
          body.statusCol || null,
          body.resolutionDateCol || null,
          body.etaCol || null,
        ]
      );
      const datasetId = datasetResult.rows[0].id;

      // Build the value tuples once, then insert in batches (one round trip per
      // batch instead of one per row — far faster and safe within serverless limits).
      const COLS = 9;
      const validRows = body.rows.filter((row) => {
        const q = row[body.questionCol];
        const a = row[body.answerCol];
        return q != null && a != null && String(q).trim() !== "";
      });

      const BATCH = 200;
      for (let start = 0; start < validRows.length; start += BATCH) {
        const chunk = validRows.slice(start, start + BATCH);
        const values: unknown[] = [];
        const placeholders = chunk.map((row, i) => {
          const base = i * COLS;
          values.push(
            datasetId,
            String(row[body.questionCol]),
            String(row[body.answerCol]),
            cell(row, body.categoryCol),
            cell(row, body.dateCol),
            cell(row, body.typeCol),
            cell(row, body.statusCol),
            cell(row, body.resolutionDateCol),
            cell(row, body.etaCol)
          );
          const ph = Array.from({ length: COLS }, (_, j) => `$${base + j + 1}`);
          return `(${ph.join(", ")})`;
        });

        await client.query(
          `INSERT INTO qa_entries
             (dataset_id, question, answer, category, issue_date, issue_type, status, resolution_date, eta)
           VALUES ${placeholders.join(", ")}`,
          values
        );
      }

      await client.query("COMMIT");

      // The textual analysis (an OpenAI call) is generated lazily on first view of
      // the Analysis tab and cached, so the upload itself stays fast.
      return res.status(200).json({ id: datasetId });
    } catch (err) {
      await client.query("ROLLBACK");
      console.error(err);
      return res.status(500).json({ error: "Failed to save dataset" });
    } finally {
      client.release();
    }
  }

  if (req.method === "PATCH") {
    const { id } = req.body as { id: number };
    if (!id) return res.status(400).json({ error: "id is required" });

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("UPDATE datasets SET is_active = FALSE");
      const result = await client.query("UPDATE datasets SET is_active = TRUE WHERE id = $1", [id]);
      if (result.rowCount === 0) {
        await client.query("ROLLBACK");
        return res.status(404).json({ error: "Dataset not found" });
      }
      await client.query("COMMIT");
      return res.status(200).json({ success: true });
    } catch (err) {
      await client.query("ROLLBACK");
      console.error(err);
      return res.status(500).json({ error: "Failed to set active dataset" });
    } finally {
      client.release();
    }
  }

  if (req.method === "DELETE") {
    const { id } = req.body as { id: number };
    if (!id) return res.status(400).json({ error: "id is required" });

    // qa_entries are removed automatically via ON DELETE CASCADE.
    const result = await pool.query("DELETE FROM datasets WHERE id = $1", [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Dataset not found" });
    }
    return res.status(200).json({ success: true });
  }

  res.setHeader("Allow", "GET, POST, PATCH, DELETE");
  return res.status(405).json({ error: "Method not allowed" });
}
