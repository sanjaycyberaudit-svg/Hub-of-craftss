import postgres from "postgres";
const sql = postgres(process.env.DATABASE_URL, { max: 1, prepare: false });
const tables = await sql`select table_name from information_schema.tables where table_schema='public' and table_name ilike '%setting%' or table_name ilike '%banner%' or table_name ilike '%social%' order by 1`;
console.log(tables);
const sample = await sql`select current_database(), current_user`;
console.log(sample);
await sql.end();
