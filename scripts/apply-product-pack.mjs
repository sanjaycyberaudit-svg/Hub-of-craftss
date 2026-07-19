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
await sql.unsafe(readFileSync("supabase/13-product-pack.sql", "utf8"));
const cols = await sql`
  select column_name
  from information_schema.columns
  where table_name = 'products'
    and column_name in ('sold_as_pack', 'pack_size')
  order by 1
`;
console.log(JSON.stringify(cols));
await sql.end({ timeout: 5 });
