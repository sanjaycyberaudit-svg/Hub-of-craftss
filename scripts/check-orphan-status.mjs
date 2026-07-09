import postgres from "postgres";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
const sql = postgres(process.env.DATABASE_URL, { max: 1 });

const [live] = await sql`
  select count(*)::int as count from products
  where collection_id is null and is_draft = false and archived_at is null
`;
const [draft] = await sql`
  select count(*)::int as count from products
  where collection_id is null and is_draft = true
`;
console.log(JSON.stringify({ uncategorizedLive: live.count, uncategorizedDraft: draft.count }));
await sql.end();
