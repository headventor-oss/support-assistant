import { Pool } from "pg";

let pool: Pool | undefined;

export function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_URL?.includes("localhost")
        ? false
        : { rejectUnauthorized: false },
    });
  }
  return pool;
}

export interface DatasetRow {
  id: number;
  name: string;
  version: number;
  question_col: string;
  answer_col: string;
  category_col: string | null;
  is_active: boolean;
  created_at: string;
}

export interface QaEntryRow {
  id: number;
  dataset_id: number;
  question: string;
  answer: string;
  category: string | null;
}
