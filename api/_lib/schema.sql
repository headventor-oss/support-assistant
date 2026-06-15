CREATE TABLE IF NOT EXISTS datasets (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  version INT NOT NULL,
  question_col TEXT NOT NULL,
  answer_col TEXT NOT NULL,
  category_col TEXT,
  is_active BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS qa_entries (
  id SERIAL PRIMARY KEY,
  dataset_id INT NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  category TEXT
);

CREATE INDEX IF NOT EXISTS idx_qa_entries_dataset_id ON qa_entries(dataset_id);

-- AI-generated textual analysis of issues & resolutions, computed once at upload
ALTER TABLE datasets ADD COLUMN IF NOT EXISTS analysis TEXT;

-- Analytics column mapping (which Excel column maps to which analytics field)
ALTER TABLE datasets ADD COLUMN IF NOT EXISTS date_col TEXT;
ALTER TABLE datasets ADD COLUMN IF NOT EXISTS type_col TEXT;
ALTER TABLE datasets ADD COLUMN IF NOT EXISTS status_col TEXT;
ALTER TABLE datasets ADD COLUMN IF NOT EXISTS resolution_date_col TEXT;
ALTER TABLE datasets ADD COLUMN IF NOT EXISTS eta_col TEXT;

-- Analytics values stored per entry (text to avoid timezone/parse issues)
ALTER TABLE qa_entries ADD COLUMN IF NOT EXISTS issue_date TEXT;
ALTER TABLE qa_entries ADD COLUMN IF NOT EXISTS issue_type TEXT;
ALTER TABLE qa_entries ADD COLUMN IF NOT EXISTS status TEXT;
ALTER TABLE qa_entries ADD COLUMN IF NOT EXISTS resolution_date TEXT;
ALTER TABLE qa_entries ADD COLUMN IF NOT EXISTS eta TEXT;
