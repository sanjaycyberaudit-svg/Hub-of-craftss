/**
 * Compare collections in Postgres (DATABASE_URL) vs Supabase GraphQL API.
 */
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import postgres from "postgres";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, "../.env.local");
const env = Object.fromEntries(
  readFileSync(envPath, "utf8")
    .split("\n")
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
);

const dbUrl = env.DATABASE_URL;
const ref = env.NEXT_PUBLIC_SUPABASE_PROJECT_REF;
const anon = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!dbUrl || !ref || !anon) {
  console.error("Missing DATABASE_URL, NEXT_PUBLIC_SUPABASE_PROJECT_REF, or anon key in .env.local");
  process.exit(1);
}

const sql = postgres(dbUrl, { prepare: false });

const dbRows = await sql`
  SELECT id, label, slug, "order"
  FROM collections
  ORDER BY "order" NULLS LAST, label
`;

console.log("\n=== Postgres (DATABASE_URL) ===");
console.log("Project host:", new URL(dbUrl.replace(/^postgresql:/, "http:")).hostname);
console.log("Count:", dbRows.length);
dbRows.forEach((r) => console.log(`  ${r.order ?? "-"} | ${r.label} | ${r.slug}`));

const gqlQuery = `
  query {
    collectionsCollection(orderBy: [{ title: AscNullsLast }]) {
      edges {
        node {
          id
          label
          slug
          title
        }
      }
    }
  }
`;

const gqlRes = await fetch(`https://${ref}.supabase.co/graphql/v1`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    apikey: anon,
    Authorization: `Bearer ${anon}`,
  },
  body: JSON.stringify({ query: gqlQuery }),
});

const gqlJson = await gqlRes.json();
const gqlEdges = gqlJson.data?.collectionsCollection?.edges ?? [];

console.log("\n=== GraphQL API ===");
console.log("Project ref:", ref);
console.log("Count:", gqlEdges.length);
if (gqlJson.errors?.length) {
  console.log("Errors:", JSON.stringify(gqlJson.errors, null, 2));
}
gqlEdges.forEach(({ node }) =>
  console.log(`  ${node.label} | ${node.slug} | id=${node.id}`),
);

await sql.end();
process.exit(0);
