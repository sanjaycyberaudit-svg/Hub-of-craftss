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

const sqlFile = join(root, "supabase", "04-testimonials.sql");
const migrationSql = readFileSync(sqlFile, "utf8");

const policySql = [
  `GRANT SELECT ON testimonials TO anon, authenticated`,
  `GRANT ALL ON testimonials TO authenticated`,
];

const sql = postgres(url, { max: 1 });

try {
  await sql.unsafe(migrationSql);
  console.log("OK: testimonials table, RLS, and seed");

  for (const q of policySql) {
    await sql.unsafe(q);
    console.log("OK:", q);
  }

  const [{ count }] =
    await sql`SELECT count(*)::int as count FROM testimonials WHERE is_published = true`;
  console.log("Published testimonials:", count);
  console.log("Testimonials migration complete.");
} catch (e) {
  console.error("Migration failed:", e.message);
  process.exit(1);
} finally {
  await sql.end();
}
