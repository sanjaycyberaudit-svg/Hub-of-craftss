/**
 * Backfill customer-facing product descriptions (catalog-style prose).
 * Usage: node --env-file=.env.local scripts/backfill-product-descriptions.mjs
 */
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL, { max: 1, prepare: false });

/** @type {Record<string, string>} */
const bySlug = {
  "cow-set":
    "Bring a classic cow motif to your polymer clay jewellery with this durable cutter set. It includes the main cow cutter plus a matching stud cutter so pendants and earrings stay in the same design family. Crafted from high-quality filament plastic for clean edges and long-lasting use through many making sessions.",

  "elephant-set":
    "Shape graceful elephant jewellery with this premium clay cutter set. You get the elephant cutter, two opposite-direction stud cutters, and outline cutters for refined finishing. Built from sturdy filament plastic so shapes stay sharp and comfortable to press session after session.",

  "gopuram-set":
    "Capture temple-inspired detail with the Gopuram set — made for makers who want cultural motifs that still feel wearable. Includes a gopuram pendant cutter, a matching stud cutter, and outline cutters for both pendant and stud. Premium filament plastic keeps cuts clean and the set reliable over time.",

  "horse-set-including-stud-cutter":
    "Create bold horse-inspired pieces with this full set sized for statement jewellery. The main cutter measures about 10 cm wide by 8 cm high, with matching horse-face earrings around 4 cm — ideal for coordinated pendants and studs. Durable filament plastic helps you cut consistently without cracking or warping.",

  "peacock-set-including-stud-cutter":
    "Make peacock jewellery with rich silhouette detail. The main cutter is about 9 cm high, with a matching earring stamp around 4 cm (the peacock earring stamp does not include a separate cutter). High-quality filament plastic delivers crisp edges and holds up through repeated polymer clay work.",

  "swan-with-lotus-set-including-stud-cutter":
    "A soft swan-and-lotus pairing for elegant pendants and studs. The pendant cutter is about 9 cm high, with a matching earring cutter around 3 cm so your set looks cohesive on the shop floor. Made from premium filament plastic for durable, comfortable everyday craft use.",
};

const products = await sql`
  select id, name, slug, coalesce(description, '') as description
  from products
  order by name
`;

let updated = 0;
for (const product of products) {
  const next = bySlug[product.slug];
  if (!next) {
    console.log(`skip (no template): ${product.slug}`);
    continue;
  }
  await sql`
    update products
    set description = ${next}
    where id = ${product.id}
  `;
  updated += 1;
  console.log(`updated: ${product.name}`);
}

console.log(`Done. Updated ${updated} of ${products.length} products.`);
await sql.end();
