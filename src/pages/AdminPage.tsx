import { useEffect, useState } from "react";
import ExcelUpload from "../components/ExcelUpload";
import ColumnMapper, { type ColumnMapping } from "../components/ColumnMapper";
import DatasetList from "../components/DatasetList";
import { deleteDataset, listDatasets, saveDataset, setActiveDataset } from "../lib/api";
import type { Dataset } from "../lib/types";

interface ParsedExcel {
  columns: string[];
  rows: Record<string, unknown>[];
}

export default function AdminPage() {
  const [parsed, setParsed] = useState<ParsedExcel | null>(null);
  const [saving, setSaving] = useState(false);
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [settingActiveId, setSettingActiveId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function refreshDatasets() {
    try {
      const data = await listDatasets();
      setDatasets(data);
    } catch (err) {
      console.error(err);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refreshDatasets();
  }, []);

  async function handleSave(mapping: ColumnMapping) {
    if (!parsed) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      await saveDataset({ ...mapping, rows: parsed.rows });
      setMessage(`Dataset "${mapping.name}" saved with ${parsed.rows.length} rows.`);
      setParsed(null);
      await refreshDatasets();
    } catch (err) {
      console.error(err);
      setError("Failed to save dataset. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSetActive(id: number) {
    setSettingActiveId(id);
    setError(null);
    try {
      await setActiveDataset(id);
      await refreshDatasets();
    } catch (err) {
      console.error(err);
      setError("Failed to set active dataset.");
    } finally {
      setSettingActiveId(null);
    }
  }

  async function handleDelete(dataset: Dataset) {
    const warning = dataset.isActive
      ? `"${dataset.name}" v${dataset.version} is the active dataset. Deleting it will leave no active knowledge base until you activate another. Continue?`
      : `Delete "${dataset.name}" v${dataset.version} and its ${dataset.entryCount} entries? This cannot be undone.`;
    if (!window.confirm(warning)) return;

    setDeletingId(dataset.id);
    setError(null);
    setMessage(null);
    try {
      await deleteDataset(dataset.id);
      setMessage(`Deleted "${dataset.name}" v${dataset.version}.`);
      await refreshDatasets();
    } catch (err) {
      console.error(err);
      setError("Failed to delete dataset.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="admin-page">
      <div className="admin-inner">
        <header className="admin-header">
          <h1>Knowledge base</h1>
          <p className="muted">Upload an Excel file of Q&amp;A pairs, map the columns, and pick which version is live.</p>
        </header>

        <section className="card">
          <div className="card-head">
            <span className="step-num">1</span>
            <h2>Upload Q&amp;A Excel file</h2>
          </div>
          <ExcelUpload onParsed={(data) => setParsed({ columns: data.columns, rows: data.rows })} />
          {parsed && (
            <ColumnMapper
              columns={parsed.columns}
              preview={parsed.rows.slice(0, 5)}
              onSave={handleSave}
              saving={saving}
            />
          )}
          {message && <p className="success-text">{message}</p>}
          {error && <p className="error-text">{error}</p>}
        </section>

        <section className="card">
          <div className="card-head">
            <span className="step-num">2</span>
            <h2>Dataset versions</h2>
          </div>
          <DatasetList
            datasets={datasets}
            onSetActive={handleSetActive}
            onDelete={handleDelete}
            settingActiveId={settingActiveId}
            deletingId={deletingId}
          />
        </section>
      </div>
    </div>
  );
}
