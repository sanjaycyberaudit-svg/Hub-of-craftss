import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL, { max: 1, prepare: false });

const rows = await sql`
  select key, is_enabled, left(value::text, 240) as v
  from api_settings
  where key = 'home_banner_slides'
`;
console.log(JSON.stringify(rows, null, 2));

await sql`
  update api_settings
  set is_enabled = false
  where key = 'home_banner_slides'
`;
console.log("disabled home_banner_slides");

await sql.end();
