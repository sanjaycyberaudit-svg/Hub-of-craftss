/**
 * Seed starter Hub of craftss collections, products, and testimonials.
 * Safe to re-run (upsert by fixed ids).
 *
 * Usage: node scripts/seed-hub-catalog.mjs
 */
import dotenv from "dotenv";
import postgres from "postgres";

dotenv.config({ path: ".env.local", override: true });

const sql = postgres(process.env.DATABASE_URL, {
  max: 1,
  prepare: false,
  ssl: "require",
});

/** Local public asset — avoids broken /_next/image remote host errors */
const LOGO = "/images/hub-of-craftss-logo.png";

const collections = [
  {
    id: "hoc-col-terracotta",
    label: "Terracotta materials",
    slug: "terracotta-materials",
    title: "Terracotta materials",
    description:
      "Raw terracotta materials for jewellery and craft projects at Hub of craftss.",
    order: 10,
    mediaId: "hoc-media-terracotta",
  },
  {
    id: "hoc-col-art",
    label: "Art & craft supplies",
    slug: "art-craft-supplies",
    title: "Art & craft supplies",
    description:
      "Paints, adhesives, tools and supplies — Make · Craft · Create.",
    order: 9,
    mediaId: "hoc-media-art",
  },
  {
    id: "hoc-col-jewellery",
    label: "Jewellery making",
    slug: "jewellery-making",
    title: "Jewellery making",
    description: "Findings, beads and materials for handmade jewellery.",
    order: 8,
    mediaId: "hoc-media-jewellery",
  },
  {
    id: "hoc-col-diy",
    label: "DIY kits",
    slug: "diy-kits",
    title: "DIY kits",
    description: "Ready-to-make craft kits for beginners and hobbyists.",
    order: 7,
    mediaId: "hoc-media-diy",
  },
];

const products = [
  {
    id: "hoc-prod-clay-pack",
    name: "Terracotta clay pack",
    slug: "terracotta-clay-pack",
    productCode: "HOC001",
    price: "249.00",
    featured: true,
    collectionId: "hoc-col-terracotta",
    mediaId: "hoc-media-prod-1",
    description: "Natural terracotta clay for jewellery and figurines.",
  },
  {
    id: "hoc-prod-paint-set",
    name: "Acrylic craft paint set",
    slug: "acrylic-craft-paint-set",
    productCode: "HOC002",
    price: "399.00",
    featured: true,
    collectionId: "hoc-col-art",
    mediaId: "hoc-media-prod-2",
    description: "Bright acrylic paints for craft and terracotta projects.",
  },
  {
    id: "hoc-prod-bead-kit",
    name: "Bead jewellery starter kit",
    slug: "bead-jewellery-starter-kit",
    productCode: "HOC003",
    price: "599.00",
    featured: true,
    collectionId: "hoc-col-jewellery",
    mediaId: "hoc-media-prod-3",
    description: "Beads, findings and wire for beginner jewellery making.",
  },
  {
    id: "hoc-prod-glue",
    name: "Craft glue bottle",
    slug: "craft-glue-bottle",
    productCode: "HOC004",
    price: "149.00",
    featured: false,
    collectionId: "hoc-col-art",
    mediaId: "hoc-media-prod-4",
    description: "Strong craft adhesive for paper, fabric and terracotta.",
  },
  {
    id: "hoc-prod-diy-kit",
    name: "Terracotta jewellery DIY kit",
    slug: "terracotta-jewellery-diy-kit",
    productCode: "HOC005",
    price: "899.00",
    featured: true,
    collectionId: "hoc-col-diy",
    mediaId: "hoc-media-prod-5",
    description: "Complete DIY kit to make terracotta earrings at home.",
  },
  {
    id: "hoc-prod-tools",
    name: "Craft tool set",
    slug: "craft-tool-set",
    productCode: "HOC006",
    price: "1299.00",
    featured: false,
    collectionId: "hoc-col-art",
    mediaId: "hoc-media-prod-6",
    description: "Essential hand tools for clay and craft work.",
  },
];

const testimonials = [
  {
    id: "hoc-t1",
    customerName: "Priya S.",
    location: "Madurai, Tamil Nadu",
    quote:
      "Loved the terracotta materials from Hub of craftss — perfect for my jewellery workshop.",
    order: 10,
    mediaId: "hoc-media-t1",
  },
  {
    id: "hoc-t2",
    customerName: "Anitha R.",
    location: "Chennai, Tamil Nadu",
    quote:
      "Quality craft supplies and friendly guidance from Shaaru. Make · Craft · Create for real!",
    order: 9,
    mediaId: "hoc-media-t2",
  },
  {
    id: "hoc-t3",
    customerName: "Lakshmi M.",
    location: "Coimbatore, Tamil Nadu",
    quote:
      "Ordered DIY kits online — packing was neat and colours matched what I saw on Instagram.",
    order: 8,
    mediaId: "hoc-media-t3",
  },
  {
    id: "hoc-t4",
    customerName: "Meena K.",
    location: "Tirunelveli, Tamil Nadu",
    quote:
      "Visited the Sarojini Nagar store — great range of terracotta raw materials at fair prices.",
    order: 7,
    mediaId: "hoc-media-t4",
  },
];

async function upsertMedia(id, alt) {
  await sql`
    insert into medias (id, key, alt)
    values (${id}, ${LOGO}, ${alt})
    on conflict (id) do update set
      key = excluded.key,
      alt = excluded.alt
  `;
}

for (const c of collections) {
  await upsertMedia(c.mediaId, `${c.label} — Hub of craftss`);
  await sql`
    insert into collections (id, label, slug, title, description, "order", featured_image_id)
    values (
      ${c.id}, ${c.label}, ${c.slug}, ${c.title}, ${c.description},
      ${c.order}, ${c.mediaId}
    )
    on conflict (id) do update set
      label = excluded.label,
      slug = excluded.slug,
      title = excluded.title,
      description = excluded.description,
      "order" = excluded."order",
      featured_image_id = excluded.featured_image_id
  `;
  console.log("collection", c.slug);
}

for (const p of products) {
  await upsertMedia(p.mediaId, `${p.name} — Hub of craftss`);
  await sql`
    insert into products (
      id, name, slug, product_code, description, featured, price, stock,
      collection_id, featured_image_id, is_draft, tags, images
    )
    values (
      ${p.id}, ${p.name}, ${p.slug}, ${p.productCode}, ${p.description},
      ${p.featured}, ${p.price}, 25, ${p.collectionId}, ${p.mediaId},
      false, ${sql.json([])}, ${sql.json([])}
    )
    on conflict (id) do update set
      name = excluded.name,
      slug = excluded.slug,
      product_code = excluded.product_code,
      description = excluded.description,
      featured = excluded.featured,
      price = excluded.price,
      collection_id = excluded.collection_id,
      featured_image_id = excluded.featured_image_id,
      is_draft = false
  `;
  console.log("product", p.slug);
}

for (const t of testimonials) {
  await upsertMedia(t.mediaId, `Customer — ${t.customerName}`);
  await sql`
    insert into testimonials (
      id, kind, customer_name, location, quote, rating,
      featured_image_id, is_published, "order"
    )
    values (
      ${t.id}, 'text', ${t.customerName}, ${t.location}, ${t.quote},
      5, ${t.mediaId}, true, ${t.order}
    )
    on conflict (id) do update set
      customer_name = excluded.customer_name,
      location = excluded.location,
      quote = excluded.quote,
      featured_image_id = excluded.featured_image_id,
      is_published = true,
      "order" = excluded."order"
  `;
  console.log("testimonial", t.id);
}

const counts = await sql`
  select
    (select count(*)::int from collections) as collections,
    (select count(*)::int from products) as products,
    (select count(*)::int from testimonials) as testimonials
`;
console.log("counts", counts[0]);

await sql.end();
