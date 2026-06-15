import { useRef, useState } from "react";
import * as XLSX from "xlsx";

interface ParsedExcel {
  columns: string[];
  rows: Record<string, unknown>[];
}

interface ExcelUploadProps {
  onParsed: (data: ParsedExcel) => void;
}

export default function ExcelUpload({ onParsed }: ExcelUploadProps) {
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFile(file: File) {
    setError(null);
    setFileName(file.name);
    setProgress(0);

    const reader = new FileReader();

    reader.onprogress = (e) => {
      if (e.lengthComputable) {
        // Reading from disk accounts for the first 80% of the bar.
        setProgress(Math.round((e.loaded / e.total) * 80));
      }
    };

    reader.onerror = () => {
      setError("Could not read this file. Please try again.");
      setProgress(null);
    };

    reader.onload = () => {
      setProgress(90);
      // Defer parsing so the bar paints at 90% before the synchronous parse runs.
      setTimeout(() => {
        try {
          const data = new Uint8Array(reader.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: "array", cellDates: true });
          const sheet = workbook.Sheets[workbook.SheetNames[0]];
          const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });

          if (rawRows.length === 0) {
            setError("The selected sheet has no data rows.");
            setProgress(null);
            return;
          }

          // Normalise Date cells to YYYY-MM-DD (using local parts to avoid TZ shift).
          const rows = rawRows.map((row) => {
            const out: Record<string, unknown> = {};
            for (const [k, v] of Object.entries(row)) {
              if (v instanceof Date) {
                const y = v.getFullYear();
                const m = String(v.getMonth() + 1).padStart(2, "0");
                const d = String(v.getDate()).padStart(2, "0");
                out[k] = `${y}-${m}-${d}`;
              } else {
                out[k] = v;
              }
            }
            return out;
          });

          const columns = Object.keys(rows[0]);
          setProgress(100);
          onParsed({ columns, rows });
          setTimeout(() => setProgress(null), 500);
        } catch (err) {
          console.error(err);
          setError("Could not read this file. Please upload a valid .xlsx or .csv file.");
          setProgress(null);
        }
      }, 60);
    };

    reader.readAsArrayBuffer(file);
  }

  const processing = progress !== null;

  return (
    <div className="upload">
      <div className="upload-box">
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
            e.target.value = "";
          }}
          style={{ display: "none" }}
        />
        <button
          type="button"
          className="btn btn-secondary"
          disabled={processing}
          onClick={() => inputRef.current?.click()}
        >
          Choose Excel / CSV file
        </button>
        {fileName && <span className="upload-filename">{fileName}</span>}
      </div>

      {processing && (
        <div>
          <div className="progress-row">
            <span>{progress! < 100 ? "Processing file…" : "Done"}</span>
            <span>{progress}%</span>
          </div>
          <div className="progress">
            <div className="progress-bar" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      {error && <p className="error-text">{error}</p>}
    </div>
  );
}
