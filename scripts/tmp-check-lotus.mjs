import fs from "fs";
import postgres from "postgres";

function loadEnv(path) {
  const env = {};
  for (const line of fs.readFileSync(path, "utf8").split(/\r?\n/)) {
    if (!line || line.startsWith("#") || !line.includes("=")) continue;
    const i = line.indexOf("=");
    let v = line.slice(i + 1).trim();
    if ((v.startsWith("\"") && v.endsWith("\"")) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    env[line.slice(0, i).trim()] = v;
  }
  return env;
}

const env = loadEnv(".env.local");
const sql = postgres(env.DATABASE_URL, { ssl: "require", max: 1 });

const productCols = await sql`
  select column_name from information_schema.columns
  where table_schema='public' and table_name='products'
  order by ordinal_position
`;
console.log("products cols", productCols.map(r => r.column_name));

const mediaCols = await sql`
  select column_name from information_schema.columns
  where table_schema='public' and table_name='medias'
  order by ordinal_position
`;
console.log("medias cols", mediaCols.map(r => r.column_name));

const p = await sql`
  select id, slug, name, featured_image_id
  from products
  where slug = 'lotus-clay-cutter-and-stud'
  limit 1
`;
console.log("lotus product", p);

const featuredId = p[0]?.featured_image_id;
if (!featuredId) {
  console.log("No featured_image_id on product");
  await sql.end();
  process.exit(0);
}

const media = await sql`
  select id, key, alt from medias where id = ${featuredId} limit 1
`;
console.log("featured media", media);

await sql.end();
