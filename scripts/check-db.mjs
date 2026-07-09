import postgres from "postgres";
import dotenv from "dotenv";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: join(root, ".env.local") });
const sql = postgres(process.env.DATABASE_URL, { max: 1 });

const rls = await sql`
  SELECT c.relname, c.relrowsecurity
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relkind = 'r'
  AND c.relname IN ('products', 'collections', 'medias')
`;
console.log("RLS:", rls);

const products = await sql`SELECT id, name, featured FROM products LIMIT 10`;
console.log("Products:", products);

const ext = await sql`SELECT extname FROM pg_extension WHERE extname = 'pg_graphql'`;
console.log("Extensions:", ext);

await sql.end();
