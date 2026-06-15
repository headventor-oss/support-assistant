import type { Dataset } from "../lib/types";

interface DatasetListProps {
  datasets: Dataset[];
  onSetActive: (id: number) => void;
  onDelete: (dataset: Dataset) => void;
  settingActiveId: number | null;
  deletingId: number | null;
}

export default function DatasetList({
  datasets,
  onSetActive,
  onDelete,
  settingActiveId,
  deletingId,
}: DatasetListProps) {
  if (datasets.length === 0) {
    return <p className="muted">No datasets uploaded yet.</p>;
  }

  return (
    <table className="dataset-table">
      <thead>
        <tr>
          <th>Name</th>
          <th>Version</th>
          <th>Entries</th>
          <th>Uploaded</th>
          <th>Status</th>
          <th className="col-actions"></th>
        </tr>
      </thead>
      <tbody>
        {datasets.map((d) => (
          <tr key={d.id}>
            <td>{d.name}</td>
            <td>v{d.version}</td>
            <td>{d.entryCount}</td>
            <td>{new Date(d.createdAt).toLocaleString()}</td>
            <td>{d.isActive ? <span className="badge badge-active">Active</span> : null}</td>
            <td className="col-actions">
              <div className="row-actions">
                {!d.isActive && (
                  <button
                    type="button"
                    className="btn btn-secondary btn-small"
                    disabled={settingActiveId === d.id || deletingId === d.id}
                    onClick={() => onSetActive(d.id)}
                  >
                    {settingActiveId === d.id ? "Activating…" : "Set Active"}
                  </button>
                )}
                <button
                  type="button"
                  className="btn btn-danger btn-small"
                  disabled={deletingId === d.id || settingActiveId === d.id}
                  onClick={() => onDelete(d)}
                >
                  {deletingId === d.id ? "Deleting…" : "Delete"}
                </button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
