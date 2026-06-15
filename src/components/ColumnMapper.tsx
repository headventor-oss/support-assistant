import { useMemo, useState } from "react";

export interface ColumnMapping {
  name: string;
  questionCol: string;
  answerCol: string;
  categoryCol?: string;
  dateCol?: string;
  typeCol?: string;
  statusCol?: string;
  resolutionDateCol?: string;
  etaCol?: string;
}

interface ColumnMapperProps {
  columns: string[];
  preview: Record<string, unknown>[];
  onSave: (mapping: ColumnMapping) => void;
  saving: boolean;
}

/** Find the column whose name best matches any of the given keywords. */
function detect(columns: string[], keywords: string[]): string {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z]/g, "");
  for (const kw of keywords) {
    const hit = columns.find((c) => norm(c).includes(norm(kw)));
    if (hit) return hit;
  }
  return "";
}

interface MapSelectProps {
  label: string;
  value: string;
  columns: string[];
  onChange: (v: string) => void;
  optional?: boolean;
}

function MapSelect({ label, value, columns, onChange, optional }: MapSelectProps) {
  return (
    <label className="field">
      <span>
        {label}
        {optional && <em className="muted"> — optional</em>}
      </span>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {optional && <option value="">None</option>}
        {columns.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
    </label>
  );
}

export default function ColumnMapper({ columns, preview, onSave, saving }: ColumnMapperProps) {
  const guess = useMemo(
    () => ({
      question: detect(columns, ["issue", "question", "problem", "query"]) || columns[0] || "",
      answer: detect(columns, ["resolution", "answer", "solution", "fix"]) || columns[1] || columns[0] || "",
      category: detect(columns, ["category", "module", "area"]),
      date: detect(columns, ["dateofissue", "issuedate", "raiseddate", "createddate", "dateissue"]),
      type: detect(columns, ["typeofissue", "type", "classification"]),
      status: detect(columns, ["status", "state"]),
      resolutionDate: detect(columns, ["dateofresolution", "resolutiondate", "resolveddate", "closeddate"]),
      eta: detect(columns, ["estimatedtime", "eta", "timetofix", "estimate"]),
    }),
    [columns]
  );

  const [name, setName] = useState("SAP FI Data Issues");
  const [questionCol, setQuestionCol] = useState(guess.question);
  const [answerCol, setAnswerCol] = useState(guess.answer);
  const [categoryCol, setCategoryCol] = useState(guess.category);
  const [dateCol, setDateCol] = useState(guess.date);
  const [typeCol, setTypeCol] = useState(guess.type);
  const [statusCol, setStatusCol] = useState(guess.status);
  const [resolutionDateCol, setResolutionDateCol] = useState(guess.resolutionDate);
  const [etaCol, setEtaCol] = useState(guess.eta);

  return (
    <div className="column-mapper">
      <h3>Map your columns</h3>

      <label className="field">
        <span>Dataset name</span>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. SAP FI Data Issues" />
      </label>

      <div className="mapper-grid">
        <MapSelect label="Question / Issue" value={questionCol} columns={columns} onChange={setQuestionCol} />
        <MapSelect label="Answer / Resolution" value={answerCol} columns={columns} onChange={setAnswerCol} />
        <MapSelect label="Category" value={categoryCol} columns={columns} onChange={setCategoryCol} optional />
        <MapSelect label="Type of issue" value={typeCol} columns={columns} onChange={setTypeCol} optional />
        <MapSelect label="Status" value={statusCol} columns={columns} onChange={setStatusCol} optional />
        <MapSelect label="Date of issue" value={dateCol} columns={columns} onChange={setDateCol} optional />
        <MapSelect
          label="Date of resolution"
          value={resolutionDateCol}
          columns={columns}
          onChange={setResolutionDateCol}
          optional
        />
        <MapSelect label="Estimated time to fix" value={etaCol} columns={columns} onChange={setEtaCol} optional />
      </div>

      <p className="muted mapper-hint">
        Category, Type, Status and the date columns power the Analysis dashboard. Map them to see trends.
      </p>

      <div className="preview-table-wrapper">
        <table className="preview-table">
          <thead>
            <tr>
              {columns.map((c) => (
                <th key={c}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {preview.map((row, i) => (
              <tr key={i}>
                {columns.map((c) => (
                  <td key={c}>{String(row[c] ?? "")}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button
        type="button"
        className="btn btn-primary"
        disabled={saving || !name || !questionCol || !answerCol}
        onClick={() =>
          onSave({
            name,
            questionCol,
            answerCol,
            categoryCol: categoryCol || undefined,
            dateCol: dateCol || undefined,
            typeCol: typeCol || undefined,
            statusCol: statusCol || undefined,
            resolutionDateCol: resolutionDateCol || undefined,
            etaCol: etaCol || undefined,
          })
        }
      >
        {saving ? "Saving…" : "Save Dataset"}
      </button>

      {saving && (
        <div style={{ marginTop: 14 }}>
          <div className="progress-row">
            <span>Saving rows to the knowledge base…</span>
          </div>
          <div className="progress indeterminate">
            <div className="progress-bar" />
          </div>
        </div>
      )}
    </div>
  );
}
