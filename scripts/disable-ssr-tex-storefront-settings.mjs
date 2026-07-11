import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL, { max: 1, prepare: false });

const keys = await sql`select key, is_enabled from api_settings order by key`;
console.log(
  keys.map((r) => `${r.key}=${r.is_enabled}`).join("\n") || "(no rows)",
);

const disabled = await sql`
  update api_settings
  set is_enabled = false
  where key in (
    'home_banner_slides',
    'storefront_social',
    'storefront_contact',
    'announcement_bar'
  )
  returning key, is_enabled
`;
console.log("disabled:", disabled);

await sql.end();
