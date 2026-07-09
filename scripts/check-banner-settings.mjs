import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL, { max: 1 });
try {
  const keys = await sql`SELECT key FROM api_settings ORDER BY key`;
  console.log("api_settings keys:", keys.map((k) => k.key));
  const banner = await sql`SELECT key, value FROM api_settings WHERE key ILIKE '%banner%'`;
  console.log("banner rows:", JSON.stringify(banner, null, 2));
} catch (e) {
  console.log("ERR", e.message);
} finally {
  await sql.end();
}
