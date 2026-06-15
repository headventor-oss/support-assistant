import * as XLSX from "xlsx";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const BASE_URL = process.env.BASE_URL || "http://localhost:5174";

async function main() {
  const filePath = join(__dirname, "..", "sample-data", "sap-financial-data-issues.xlsx");
  const buf = readFileSync(filePath);
  const workbook = XLSX.read(buf, { type: "buffer", cellDates: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });

  // Normalise any Date cells to YYYY-MM-DD strings (local parts).
  const rows = rawRows.map((row) => {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(row)) {
      if (v instanceof Date) {
        const y = v.getUTCFullYear();
        const m = String(v.getUTCMonth() + 1).padStart(2, "0");
        const d = String(v.getUTCDate()).padStart(2, "0");
        out[k] = `${y}-${m}-${d}`;
      } else {
        out[k] = v;
      }
    }
    return out;
  });

  console.log(`Loaded ${rows.length} rows. Columns:`, Object.keys(rows[0]));

  const saveRes = await fetch(`${BASE_URL}/api/admin/datasets`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "SAP FI Data Issues",
      questionCol: "Issue",
      answerCol: "Resolution",
      categoryCol: "Category",
      typeCol: "Type_of_Issue",
      statusCol: "Status",
      dateCol: "Date_of_Issue",
      resolutionDateCol: "Date_of_Resolution",
      etaCol: "Estimated_Time_to_Fix",
      rows,
    }),
  });
  if (!saveRes.ok) throw new Error(`Save failed: ${await saveRes.text()}`);
  const { id } = await saveRes.json();
  console.log(`Saved dataset id=${id}`);

  const activateRes = await fetch(`${BASE_URL}/api/admin/datasets`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id }),
  });
  if (!activateRes.ok) throw new Error(`Activate failed: ${await activateRes.text()}`);
  console.log(`Activated dataset id=${id}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
