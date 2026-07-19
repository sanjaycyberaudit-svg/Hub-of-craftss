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
await sql`select pg_notify('pgrst', 'reload schema')`;
console.log("reload notified");

const url = `https://${env.NEXT_PUBLIC_SUPABASE_PROJECT_REF}.supabase.co/graphql/v1`;
const res = await fetch(url, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    apikey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    Authorization: `Bearer ${env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
  },
  body: JSON.stringify({
    query: `{ __type(name: "products") { fields { name } } }`,
  }),
});
const json = await res.json();
const names = (json.data?.__type?.fields || []).map((f) => f.name);
console.log(
  JSON.stringify({
    hasSold: names.includes("sold_as_pack"),
    hasPack: names.includes("pack_size"),
    sample: names.filter((n) => /pack|discount|sold/i.test(n)),
  }),
);
await sql.end({ timeout: 5 });
