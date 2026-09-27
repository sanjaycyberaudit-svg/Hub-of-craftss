/**
 * Pure helpers for the hub-catalog Worker (no bindings, no I/O) so the SQL,
 * price maths and diffing can be unit-tested against a real SQLite engine.
 *
 * Every query here mirrors a Hub storefront read path; keep them in lockstep:
 *  - graphql search  → src/lib/storefront/documents.ts (Search / SearchInCollection)
 *  - price search    → src/lib/storefront/product-price-search.ts
 *  - collection hits → src/lib/storefront/collection-search.ts
 *  - featured        → FeaturedProductsQueryDocument
 *  - collections     → src/lib/storefront/collections-list.ts
 */

/** D1: at most 100 bound parameters per statement. */
export const MAX_BOUND_PARAMS = 100;
/** D1: LIKE patterns are capped at 50 bytes; `%term%` adds two. */
export const MAX_SEARCH_TERM_BYTES = 48;
export const MAX_PAGE_SIZE = 50;
export const COLLECTIONS_LIST_LIMIT = 50;

export type SupabaseMediaEmbed = {
  key: string | null;
  alt: string | null;
} | null;

export type SupabaseProductRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  rating: string | number | null;
  badge: string | null;
  price: string | number | null;
  discount_enabled: boolean | null;
  discount_percent: number | null;
  stock: number | null;
  featured: boolean | null;
  created_at: string;
  collection_id: string | null;
  featured_image_id: string;
  medias: SupabaseMediaEmbed;
};

export type SupabaseCollectionRow = {
  id: string;
  label: string;
  slug: string;
  title: string;
  description: string;
  order: number | null;
  featured_image_id: string | null;
  medias: SupabaseMediaEmbed;
};

export const PRODUCT_COLUMNS = [
  "id",
  "name",
  "slug",
  "description",
  "rating",
  "badge",
  "price",
  "price_paise",
  "effective_paise",
  "effective_rupees",
  "discount_enabled",
  "discount_percent",
  "stock",
  "featured",
  "created_at",
  "created_at_ms",
  "collection_id",
  "image_id",
  "image_key",
  "image_alt",
  "row_hash",
] as const;

export const COLLECTION_COLUMNS = [
  "id",
  "label",
  "slug",
  "title",
  "description",
  "sort_order",
  "image_id",
  "image_key",
  "image_alt",
  "row_hash",
] as const;

export type SqlValue = string | number | null;
export type MirrorRow = { id: string; row_hash: string; values: SqlValue[] };
export type SqlStatement = { sql: string; params: SqlValue[] };

/** Decimal text ("1299.5", "1299.00") → integer paise, without float maths. */
export function toPaise(value: string | number | null | undefined): number {
  const text = String(value ?? "0").trim();
  const match = /^(-?)(\d*)(?:\.(\d*))?$/.exec(text);
  if (!match) throw new Error(`invalid price: ${text}`);
  const [, sign, whole = "", fraction = ""] = match;
  const frac = (fraction + "00").slice(0, 2);
  const roundUp = Number(fraction.charAt(2) || "0") >= 5 ? 1 : 0;
  const paise = Number(whole || "0") * 100 + Number(frac) + roundUp;
  return sign === "-" ? -paise : paise;
}

/** Postgres ROUND(numeric) semantics: half away from zero. */
function divRoundHalfAwayFromZero(numerator: number, divisor: number): number {
  const sign = numerator < 0 ? -1 : 1;
  return sign * Math.floor((Math.abs(numerator) + divisor / 2) / divisor);
}

/**
 * Integer-exact twin of `effectivePriceSql` in src/lib/storefront/effective-price.ts:
 * ROUND(price * (1 - pct / 100), 2), then ROUND(...) to whole rupees for buckets.
 */
export function computeEffectivePrice(
  pricePaise: number,
  discountEnabled: boolean,
  discountPercent: number | null,
): { paise: number; rupees: number } {
  const pct = discountPercent ?? 0;
  const discounted = discountEnabled && pct >= 1 && pct <= 99;
  const paise = discounted
    ? divRoundHalfAwayFromZero(pricePaise * (100 - pct), 100)
    : pricePaise;
  return { paise, rupees: divRoundHalfAwayFromZero(paise, 100) };
}

function toDecimalText(value: string | number | null, scale: number): string {
  if (typeof value === "string") return value;
  return Number(value ?? 0).toFixed(scale);
}

function boolToInt(value: boolean | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  return value ? 1 : 0;
}

async function sha256Hex(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
}

export async function toProductMirrorRow(
  row: SupabaseProductRow,
): Promise<MirrorRow> {
  const createdAtMs = Date.parse(row.created_at);
  if (!Number.isFinite(createdAtMs)) {
    throw new Error(`product ${row.id}: invalid created_at ${row.created_at}`);
  }
  const price = toDecimalText(row.price, 2);
  const pricePaise = toPaise(price);
  const discountEnabled = Boolean(row.discount_enabled);
  const effective = computeEffectivePrice(
    pricePaise,
    discountEnabled,
    row.discount_percent,
  );
  const values: SqlValue[] = [
    row.id,
    row.name,
    row.slug,
    row.description,
    toDecimalText(row.rating ?? "4", 1),
    row.badge,
    price,
    pricePaise,
    effective.paise,
    effective.rupees,
    discountEnabled ? 1 : 0,
    row.discount_percent,
    row.stock,
    boolToInt(row.featured),
    row.created_at,
    createdAtMs,
    row.collection_id,
    row.featured_image_id,
    row.medias?.key ?? null,
    row.medias?.alt ?? null,
  ];
  const rowHash = await sha256Hex(JSON.stringify(values));
  return { id: row.id, row_hash: rowHash, values: [...values, rowHash] };
}

export async function toCollectionMirrorRow(
  row: SupabaseCollectionRow,
): Promise<MirrorRow> {
  const values: SqlValue[] = [
    row.id,
    row.label,
    row.slug,
    row.title,
    row.description,
    row.order,
    row.featured_image_id,
    row.medias?.key ?? null,
    row.medias?.alt ?? null,
  ];
  const rowHash = await sha256Hex(JSON.stringify(values));
  return { id: row.id, row_hash: rowHash, values: [...values, rowHash] };
}

export function diffMirrorRows(
  existingHashes: Map<string, string>,
  next: MirrorRow[],
): { upserts: MirrorRow[]; deletes: string[] } {
  const nextIds = new Set(next.map((row) => row.id));
  const upserts = next.filter(
    (row) => existingHashes.get(row.id) !== row.row_hash,
  );
  const deletes = [...existingHashes.keys()].filter((id) => !nextIds.has(id));
  return { upserts, deletes };
}

export function buildUpsertStatements(
  table: "products" | "collections",
  columns: readonly string[],
  rows: MirrorRow[],
): SqlStatement[] {
  const rowsPerStatement = Math.max(
    1,
    Math.floor(MAX_BOUND_PARAMS / columns.length),
  );
  const placeholders = `(${columns.map(() => "?").join(", ")})`;
  const statements: SqlStatement[] = [];
  for (let i = 0; i < rows.length; i += rowsPerStatement) {
    const chunk = rows.slice(i, i + rowsPerStatement);
    statements.push({
      sql: `INSERT OR REPLACE INTO ${table} (${columns.join(", ")}) VALUES ${chunk
        .map(() => placeholders)
        .join(", ")}`,
      params: chunk.flatMap((row) => row.values),
    });
  }
  return statements;
}

export function buildDeleteStatements(
  table: "products" | "collections",
  ids: string[],
): SqlStatement[] {
  const statements: SqlStatement[] = [];
  for (let i = 0; i < ids.length; i += MAX_BOUND_PARAMS) {
    const chunk = ids.slice(i, i + MAX_BOUND_PARAMS);
    statements.push({
      sql: `DELETE FROM ${table} WHERE id IN (${chunk.map(() => "?").join(", ")})`,
      params: chunk,
    });
  }
  return statements;
}

export type CatalogSort =
  | "best_match"
  | "price_asc"
  | "price_desc"
  | "newest"
  | "name_asc";

export const CATALOG_SORTS: readonly CatalogSort[] = [
  "best_match",
  "price_asc",
  "price_desc",
  "newest",
  "name_asc",
];

export type ProductSearchRequest = {
  term: string | null;
  collections: string[];
  priceMin: number | null;
  priceMax: number | null;
  hasPrice: boolean;
  sort: CatalogSort | null;
  first: number;
  offset: number;
};

export class UnsupportedQueryError extends Error {}

function parseIntParam(raw: string | null, fallback: number): number {
  if (raw === null || raw.trim() === "") return fallback;
  const value = Number(raw);
  return Number.isInteger(value) ? value : Number.NaN;
}

export function parseProductSearchRequest(
  params: URLSearchParams,
): ProductSearchRequest {
  const termRaw = (params.get("q") ?? "").trim();
  const term = termRaw.length > 0 ? termRaw : null;
  if (term) {
    if (new TextEncoder().encode(term).length > MAX_SEARCH_TERM_BYTES) {
      throw new UnsupportedQueryError("search term too long for D1 LIKE");
    }
    // Postgres ILIKE treats "\" as an escape; SQLite LIKE does not.
    if (term.includes("\\")) {
      throw new UnsupportedQueryError("backslash in search term");
    }
  }

  const collections = (params.get("collections") ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  if (collections.length > 20) {
    throw new UnsupportedQueryError("too many collections");
  }

  const hasPrice = params.has("price_min") && params.has("price_max");
  const priceMin = hasPrice ? Number(params.get("price_min")) : null;
  const priceMax = hasPrice ? Number(params.get("price_max")) : null;

  const sortRaw = params.get("sort");
  let sort: CatalogSort | null = null;
  if (sortRaw) {
    if (!CATALOG_SORTS.includes(sortRaw as CatalogSort)) {
      throw new UnsupportedQueryError(`unknown sort ${sortRaw}`);
    }
    sort = sortRaw as CatalogSort;
  }

  const first = parseIntParam(params.get("first"), 24);
  const offset = parseIntParam(params.get("offset"), 0);
  if (!(first >= 1 && first <= MAX_PAGE_SIZE) || !(offset >= 0)) {
    throw new UnsupportedQueryError("invalid pagination");
  }

  return {
    term,
    collections,
    priceMin,
    priceMax,
    hasPrice,
    sort,
    first,
    offset,
  };
}

const PRODUCT_CARD_SELECT = `SELECT p.id, p.name, p.description, p.rating, p.slug, p.badge,
  p.price, p.discount_enabled, p.discount_percent, p.stock,
  p.image_id, p.image_key, p.image_alt,
  c.id AS collection_ref, c.label AS collection_label, c.slug AS collection_slug
FROM products p`;

function inList(values: string[]): string {
  return values.map(() => "?").join(", ");
}

/** Matches pg_graphql ordering: requested keys, then primary key. */
function graphqlOrderBy(sort: CatalogSort | null): string {
  switch (sort) {
    case "best_match":
      return "(p.featured IS NULL) DESC, p.featured DESC, p.created_at_ms DESC, p.id ASC";
    case "price_asc":
      return "p.price_paise ASC, p.id ASC";
    case "price_desc":
      return "p.price_paise DESC, p.id ASC";
    case "newest":
      return "p.created_at_ms DESC, p.id ASC";
    case "name_asc":
      return "p.name COLLATE NOCASE ASC, p.id ASC";
    default:
      return "p.id ASC";
  }
}

/** Matches compareProducts() in product-price-search.ts (effective price, name tiebreak). */
function priceEngineOrderBy(sort: CatalogSort | null): string {
  const tail = "p.name COLLATE NOCASE ASC, p.id ASC";
  switch (sort) {
    case "best_match":
      return `COALESCE(p.featured, 0) DESC, p.created_at_ms DESC, ${tail}`;
    case "price_asc":
      return `p.effective_paise ASC, ${tail}`;
    case "price_desc":
      return `p.effective_paise DESC, ${tail}`;
    case "name_asc":
      return tail;
    case "newest":
    default:
      return `p.created_at_ms DESC, ${tail}`;
  }
}

export function buildCollectionMatchQuery(term: string): SqlStatement {
  const pattern = `%${term}%`;
  return {
    sql: `SELECT id, label, slug, image_key, image_alt FROM collections
WHERE image_key IS NOT NULL
  AND (label LIKE ? OR title LIKE ? OR slug LIKE ? OR description LIKE ?)
ORDER BY (sort_order IS NULL) ASC, sort_order ASC, id ASC`,
    params: [pattern, pattern, pattern, pattern],
  };
}

/**
 * Builds the product page query. `limit` is first + 1 so the caller can tell
 * whether another page exists without a COUNT(*).
 */
export function buildProductSearchQuery(
  request: ProductSearchRequest,
  matchedCollectionIds: string[],
): SqlStatement | null {
  const where: string[] = [];
  const params: SqlValue[] = [];
  let from: string;
  let orderBy: string;

  if (request.hasPrice) {
    const min = request.priceMin ?? Number.NaN;
    const max = request.priceMax ?? Number.NaN;
    if (!Number.isFinite(min) || !Number.isFinite(max) || min > max) {
      return null;
    }
    from = `${PRODUCT_CARD_SELECT}
INNER JOIN collections c ON c.id = p.collection_id`;
    where.push("p.effective_rupees >= ?", "p.effective_rupees <= ?");
    params.push(min, max);
    if (request.term) {
      const pattern = `%${request.term}%`;
      where.push(
        "(p.name LIKE ? OR p.slug LIKE ? OR IFNULL(p.description, '') LIKE ?)",
      );
      params.push(pattern, pattern, pattern);
    }
    orderBy = priceEngineOrderBy(request.sort);
  } else {
    from = `${PRODUCT_CARD_SELECT}
LEFT JOIN collections c ON c.id = p.collection_id`;
    if (request.term) {
      const pattern = `%${request.term}%`;
      const matchClause =
        matchedCollectionIds.length > 0
          ? ` OR p.collection_id IN (${inList(matchedCollectionIds)})`
          : "";
      where.push(
        `(p.name LIKE ? OR p.slug LIKE ? OR IFNULL(p.description, '') LIKE ?${matchClause})`,
      );
      params.push(pattern, pattern, pattern, ...matchedCollectionIds);
    }
    orderBy = graphqlOrderBy(request.sort);
  }

  if (request.collections.length > 0) {
    where.push(`p.collection_id IN (${inList(request.collections)})`);
    params.push(...request.collections);
  }

  params.push(request.first + 1, request.offset);
  return {
    sql: `${from}
${where.length > 0 ? `WHERE ${where.join(" AND ")}` : ""}
ORDER BY ${orderBy}
LIMIT ? OFFSET ?`,
    params,
  };
}

export function buildFeaturedQuery(
  first: number,
  offset: number,
): SqlStatement {
  return {
    sql: `${PRODUCT_CARD_SELECT}
LEFT JOIN collections c ON c.id = p.collection_id
WHERE p.featured = 1
ORDER BY p.created_at_ms DESC, p.id ASC
LIMIT ? OFFSET ?`,
    params: [first + 1, offset],
  };
}

export function buildCollectionsListQuery(): SqlStatement {
  return {
    sql: `SELECT id, label, slug, image_key, image_alt FROM collections
ORDER BY (sort_order IS NULL) ASC, sort_order DESC, label ASC, id ASC
LIMIT ?`,
    params: [COLLECTIONS_LIST_LIMIT],
  };
}

export type ProductCardQueryRow = {
  id: string;
  name: string;
  description: string | null;
  rating: string;
  slug: string;
  badge: string | null;
  price: string;
  discount_enabled: number;
  discount_percent: number | null;
  stock: number | null;
  image_id: string;
  image_key: string | null;
  image_alt: string | null;
  collection_ref: string | null;
  collection_label: string | null;
  collection_slug: string | null;
};

/** Same node shape as ProductCardFragment (and product-price-search.ts). */
export function toProductCardNode(row: ProductCardQueryRow) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    rating: row.rating,
    slug: row.slug,
    badge: row.badge,
    price: row.price,
    discountEnabled: Number(row.discount_enabled) === 1,
    discountPercent: row.discount_percent,
    stock: row.stock,
    featuredImage: {
      id: row.image_id,
      key: row.image_key ?? "",
      alt: row.image_alt,
    },
    collections: row.collection_ref
      ? {
          id: row.collection_ref,
          label: row.collection_label ?? "",
          slug: row.collection_slug ?? "",
        }
      : null,
  };
}

export type CollectionCardQueryRow = {
  id: string;
  label: string;
  slug: string;
  image_key: string | null;
  image_alt: string | null;
};

export function toCollectionCardNode(row: CollectionCardQueryRow) {
  return {
    id: row.id,
    label: row.label,
    slug: row.slug,
    featuredImage: row.image_key
      ? { key: row.image_key, alt: row.image_alt }
      : null,
  };
}

/** Splits a `first + 1` result into a page plus offset-cursor pageInfo. */
export function toPage<T>(rows: T[], first: number, offset: number) {
  const hasNextPage = rows.length > first;
  const page = hasNextPage ? rows.slice(0, first) : rows;
  return {
    items: page,
    pageInfo: {
      hasNextPage,
      endCursor: hasNextPage ? String(offset + page.length) : null,
    },
  };
}
