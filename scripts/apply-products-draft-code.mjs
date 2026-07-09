import postgres from "postgres";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import dotenv from "dotenv";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: join(root, ".env.local") });

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("Missing DATABASE_URL in .env.local");
  process.exit(1);
}

const migrationSql = readFileSync(
  join(root, "supabase", "08-products-draft-code.sql"),
  "utf8",
);

const sql = postgres(url, { max: 1 });

try {
  await sql.unsafe(migrationSql);
  console.log("OK: products draft/product_code columns applied");
} catch (e) {
  console.error("Migration failed:", e.message);
  process.exit(1);
} finally {
  await sql.end();
}
