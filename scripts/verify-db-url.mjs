import postgres from "postgres";
import { config } from "dotenv";
import { resolve } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
config({ path: resolve(root, ".env.local") });

const { resolveDatabaseUrl } = await import(
  "../src/lib/supabase/resolve-database-url.ts"
);

const legacy =
  "postgresql://postgres:xxx@db.qhtwwyqlsnckorndmhmt.supabase.co:5432/postgres";
const rewritten = resolveDatabaseUrl(legacy);
const host = new URL(rewritten.replace(/^postgresql:/i, "http:")).host;
console.log("rewrite sample host:", host);

const url = resolveDatabaseUrl(process.env.DATABASE_URL);
const sql = postgres(url, { prepare: false, max: 1, connect_timeout: 15 });
const [row] = await sql`select 1 as ok`;
console.log(
  "live DATABASE_URL host:",
  new URL(url.replace(/^postgresql:/i, "http:")).host,
);
console.log("connected:", row);
await sql.end();
