import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { Pool } from "pg";
import "dotenv/config";

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main() {
  const sql = readFileSync(join(__dirname, "..", "api", "_lib", "schema.sql"), "utf-8");
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes("localhost") ? false : { rejectUnauthorized: false },
  });

  await pool.query(sql);
  console.log("Database schema initialized successfully.");
  await pool.end();
}

main().catch((err) => {
  console.error("Failed to initialize database:", err);
  process.exit(1);
});
