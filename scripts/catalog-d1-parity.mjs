#!/usr/bin/env node
/**
 * Compare the hub-catalog D1 mirror with live Supabase for the storefront
 * read paths it serves. Run before setting CATALOG_READ=d1.
 *
 *   node scripts/catalog-d1-parity.mjs
 *
 * Reads NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
 * CATALOG_WORKER_URL and CATALOG_SYNC_SECRET from .env.local / env.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function loadEnv() {
  const env = { ...process.env };
  const file = path.join(ROOT, ".env.local");
  if (fs.existsSync(file)) {
    for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
      const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
      if (match && env[match[1]] === undefined) {
        env[match[1]] = match[2].replace(/^["']|["']$/g, "");
      }
    }
  }
  return env;
}

const env = loadEnv();
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, "");
const ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const WORKER = env.CATALOG_WORKER_URL?.replace(/\/+$/, "");
const SECRET = env.CATALOG_SYNC_SECRET;
if (!SUPABASE_URL || !ANON || !WORKER || !SECRET) {
  console.error("Missing Supabase or catalog worker env.");
  process.exit(2);
}

const supabaseHeaders = { apikey: ANON, Authorization: `Bearer ${ANON}` };

async function rest(pathAndQuery) {
  const rows = [];
  for (let offset = 0; ; offset += 1000) {
    const sep = pathAndQuery.includes("?") ? "&" : "?";
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/${pathAndQuery}${sep}order=id.asc&limit=1000&offset=${offset}`,
      { headers: supabaseHeaders },
    );
    if (!res.ok) throw new Error(`rest ${res.status}: ${await res.text()}`);
    const chunk = await res.json();
    rows.push(...chunk);
    if (chunk.length < 1000) return rows;
  }
}

async function graphql(query, variables) {
  const res = await fetch(`${SUPABASE_URL}/graphql/v1`, {
    method: "POST",
    headers: { ...supabaseHeaders, "content-type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });
  const body = await res.json();
  if (body.errors) throw new Error(JSON.stringify(body.errors).slice(0, 400));
  return body.data;
}

async function worker(pathAndQuery) {
  const res = await fetch(`${WORKER}${pathAndQuery}`, {
    headers: { Authorization: `Bearer ${SECRET}` },
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`worker ${res.status}: ${JSON.stringify(body)}`);
  return body;
}

const CARD_FIELDS = `id name description rating slug badge price
  discountEnabled: discount_enabled discountPercent: discount_percent stock
  featuredImage: medias { id key alt } collections { id label slug }`;

const ORDER_BY = {
  "": undefined,
  best_match: [{ featured: "DescNullsFirst" }, { created_at: "DescNullsLast" }],
  price_asc: [{ price: "AscNullsLast" }],
  price_desc: [{ price: "DescNullsLast" }],
  newest: [{ created_at: "DescNullsLast" }],
  name_asc: [{ name: "AscNullsLast" }],
};

async function graphqlSearchAll({ term, matched, collections, orderBy }) {
  const query = `query($search: String, $matched: [String!], $collections: [String!],
      $first: Int!, $after: Cursor, $orderBy: [productsOrderBy!]) {
    productsCollection(
      filter: { and: [
        { or: [
          { name: { ilike: $search } } { slug: { ilike: $search } }
          { description: { ilike: $search } } { collection_id: { in: $matched } }
        ] }
        ${collections ? "{ collection_id: { in: $collections } }" : ""}
      ] }
      first: $first after: $after orderBy: $orderBy
    ) { edges { node { ${CARD_FIELDS} } } pageInfo { hasNextPage endCursor } }
  }`;
  const nodes = [];
  let after = null;
  do {
    const data = await graphql(query, {
      search: term ? `%${term}%` : "%%",
      matched: matched.length ? matched : ["__no_collection_match__"],
      collections,
      first: 30,
      after,
      orderBy,
    });
    const page = data.productsCollection;
    nodes.push(...page.edges.map((e) => e.node));
    after = page.pageInfo.hasNextPage ? page.pageInfo.endCursor : null;
  } while (after);
  return nodes;
}

async function workerAll(route, params) {
  const nodes = [];
  let offset = 0;
  let body;
  do {
    const qs = new URLSearchParams({ ...params, first: "50", offset: String(offset) });
    body = await worker(`${route}?${qs}`);
    nodes.push(...body.productsCollection.edges.map((e) => e.node));
    offset += 50;
  } while (body.productsCollection.pageInfo.hasNextPage);
  return { nodes, matchingCollections: body.matchingCollections ?? [] };
}

let failures = 0;
let checks = 0;
function report(label, ok, detail = "") {
  checks += 1;
  if (!ok) failures += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? `  ${detail}` : ""}`);
}

function firstDiff(a, b) {
  const n = Math.max(a.length, b.length);
  for (let i = 0; i < n; i += 1) if (a[i] !== b[i]) return i;
  return -1;
}

function compareOrdered(label, expected, actual) {
  const i = firstDiff(expected, actual);
  report(
    label,
    i === -1,
    i === -1
      ? `(${actual.length})`
      : `count ${expected.length} vs ${actual.length}; first diff @${i}: ${expected[i]} vs ${actual[i]}`,
  );
}

/** JSON with object keys sorted, so field order from pg_graphql vs D1 does not matter. */
const canonical = (value) =>
  JSON.stringify(value, (_key, v) =>
    v && typeof v === "object" && !Array.isArray(v)
      ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, v[k]]))
      : v,
  );

const normalizeNode = (n) => canonical(n);

// JS twin of product-price-search.ts compareProducts (float effective price).
function effective(p) {
  const price = Number(p.price);
  const pct = p.discount_percent ?? 0;
  return p.discount_enabled && pct >= 1 && pct <= 99
    ? Math.round(price * (1 - pct / 100) * 100) / 100
    : price;
}
function priceEngineSort(rows, sort) {
  const rules = {
    "": [["created_at", "desc"]],
    best_match: [["featured", "desc"], ["created_at", "desc"]],
    price_asc: [["price", "asc"]],
    price_desc: [["price", "desc"]],
    newest: [["created_at", "desc"]],
    name_asc: [["name", "asc"]],
  }[sort];
  return [...rows].sort((a, b) => {
    for (const [key, dir] of rules) {
      let diff = 0;
      if (key === "price") diff = effective(a) - effective(b);
      if (key === "created_at") diff = Date.parse(a.created_at) - Date.parse(b.created_at);
      if (key === "name") diff = a.name.localeCompare(b.name);
      if (key === "featured") diff = (a.featured ? 1 : 0) - (b.featured ? 1 : 0);
      if (diff !== 0) return dir === "desc" ? -diff : diff;
    }
    return a.name.localeCompare(b.name);
  });
}

async function main() {
  const health = await (await fetch(`${WORKER}/health`)).json();
  console.log("mirror:", JSON.stringify(health.meta));

  const [products, drafts, collections] = await Promise.all([
    rest("products?select=id,name,slug,description,price::text,discount_enabled,discount_percent,featured,created_at,collection_id&is_draft=eq.false"),
    rest("products?select=id&is_draft=eq.true"),
    rest("collections?select=id,label,title,slug,description"),
  ]);
  const draftIds = new Set(drafts.map((d) => d.id));
  const collectionIds = new Set(collections.map((c) => c.id));
  const visible = (nodes) => nodes.filter((n) => !draftIds.has(n.id));

  // Collections list
  const gqlCollections = await graphql(
    `{ collectionsCollection(first: 50, orderBy: [{ order: DescNullsLast }, { label: AscNullsLast }]) {
        edges { node { id label slug featuredImage: medias { key alt } } } } }`,
  );
  const d1Collections = await worker("/collections");
  compareOrdered(
    "collections list order",
    gqlCollections.collectionsCollection.edges.map((e) => e.node.id),
    d1Collections.collectionsCollection.edges.map((e) => e.node.id),
  );
  report(
    "collections list fields",
    canonical(gqlCollections.collectionsCollection.edges.map((e) => e.node)) ===
      canonical(d1Collections.collectionsCollection.edges.map((e) => e.node)),
  );

  // Featured
  const gqlFeatured = [];
  let after = null;
  do {
    const data = await graphql(
      `query($after: Cursor) { productsCollection(filter: { featured: { eq: true } }, first: 30, after: $after,
         orderBy: [{ created_at: DescNullsLast }]) { edges { node { ${CARD_FIELDS} } } pageInfo { hasNextPage endCursor } } }`,
      { after },
    );
    gqlFeatured.push(...data.productsCollection.edges.map((e) => e.node));
    after = data.productsCollection.pageInfo.hasNextPage
      ? data.productsCollection.pageInfo.endCursor
      : null;
  } while (after);
  const d1Featured = await workerAll("/products/featured", {});
  compareOrdered(
    "featured order",
    visible(gqlFeatured).map((n) => n.id),
    d1Featured.nodes.map((n) => n.id),
  );

  // Full card-field comparison over every published product
  const gqlAll = visible(await graphqlSearchAll({ term: null, matched: [], orderBy: undefined }));
  const d1All = await workerAll("/products/search", {});
  const d1ById = new Map(d1All.nodes.map((n) => [n.id, n]));
  const fieldMismatches = gqlAll.filter(
    (n) => !d1ById.has(n.id) || normalizeNode(n) !== normalizeNode(d1ById.get(n.id)),
  );
  report(
    "card fields for every published product",
    fieldMismatches.length === 0,
    fieldMismatches.length
      ? `${fieldMismatches.length} mismatched, e.g. ${fieldMismatches[0].id}`
      : `(${gqlAll.length})`,
  );

  // GraphQL search engine
  const words = [...new Set(products.flatMap((p) => p.name.toLowerCase().split(/[^a-z]+/)))]
    .filter((w) => w.length >= 4)
    .slice(0, 3);
  const terms = [null, ...words, collections[0]?.label, "zzqxnope"];
  const someCollection = products.find((p) => p.collection_id)?.collection_id;

  for (const term of terms) {
    const matched = term
      ? collections
          .filter((c) =>
            [c.label, c.title, c.slug, c.description].some((v) =>
              String(v ?? "").toLowerCase().includes(term.toLowerCase()),
            ),
          )
          .map((c) => c.id)
      : [];
    for (const sort of Object.keys(ORDER_BY)) {
      if (term && sort !== "" && sort !== "best_match") continue;
      const expected = visible(
        await graphqlSearchAll({ term, matched, orderBy: ORDER_BY[sort] }),
      ).map((n) => n.id);
      const params = {};
      if (term) params.q = term;
      if (sort) params.sort = sort;
      const actual = (await workerAll("/products/search", params)).nodes.map((n) => n.id);
      compareOrdered(`search q=${term ?? "∅"} sort=${sort || "default"}`, expected, actual);
    }
  }
  if (someCollection) {
    const expected = visible(
      await graphqlSearchAll({ term: null, matched: [], collections: [someCollection], orderBy: ORDER_BY.newest }),
    ).map((n) => n.id);
    const actual = (
      await workerAll("/products/search", { collections: someCollection, sort: "newest" })
    ).nodes.map((n) => n.id);
    compareOrdered(`search in collection ${someCollection} sort=newest`, expected, actual);
  }

  // Price engine (drizzle path): categorized, rounded effective price, JS sort
  const categorized = products.filter(
    (p) => p.collection_id && collectionIds.has(p.collection_id),
  );
  for (const [min, max] of [[0, 499], [500, 999], [1000, 1999], [2000, 99999]]) {
    for (const sort of ["", "price_asc", "price_desc", "best_match", "name_asc"]) {
      const inRange = categorized.filter((p) => {
        const r = Math.round(effective(p));
        return r >= min && r <= max;
      });
      const expected = priceEngineSort(inRange, sort).map((p) => p.id);
      const params = { price_min: String(min), price_max: String(max) };
      if (sort) params.sort = sort;
      const actual = (await workerAll("/products/search", params)).nodes.map((n) => n.id);
      const sameSet =
        expected.length === actual.length &&
        [...expected].sort().join() === [...actual].sort().join();
      const i = firstDiff(expected, actual);
      report(
        `price ${min}-${max} sort=${sort || "default"}`,
        sameSet && i === -1,
        sameSet && i !== -1
          ? `same ${actual.length} items, order differs @${i} (tie-break only?)`
          : sameSet
            ? `(${actual.length})`
            : `count ${expected.length} vs ${actual.length}`,
      );
    }
  }

  console.log(`\n${checks - failures}/${checks} checks passed`);
  process.exit(failures ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(2);
});
