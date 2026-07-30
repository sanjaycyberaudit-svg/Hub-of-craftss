import { readFileSync } from "fs";
import postgres from "postgres";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [
        l.slice(0, i).trim(),
        l
          .slice(i + 1)
          .trim()
          .replace(/^["']|["']$/g, ""),
      ];
    }),
);

const sql = postgres(env.DATABASE_URL, { max: 1, prepare: false });
await sql.unsafe(readFileSync("supabase/14-medias-gallery-index.sql", "utf8"));
const indexes = await sql`
  select indexname
  from pg_indexes
  where tablename = 'medias'
    and indexname = 'medias_created_at_id_desc_idx'
`;
console.log(JSON.stringify(indexes));
await sql.end({ timeout: 5 });
