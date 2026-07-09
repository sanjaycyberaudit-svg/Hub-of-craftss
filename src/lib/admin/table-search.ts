import type { FilterFn } from "@tanstack/react-table";

const BADGE_SEARCH_ALIASES: Record<string, string> = {
  new_product: "new product",
  best_sale: "best sale bestseller",
  featured: "featured highlight",
};

function stripHtmlTags(value: string): string {
  return value.replace(/<[^>]*>/g, " ");
}

function stripDiacritics(value: string): string {
  return value.normalize("NFD").replace(/\p{M}/gu, "");
}

/** Normalize text for forgiving admin search (case, separators, spacing). */
export function normalizeAdminSearchText(value: unknown): string {
  return stripDiacritics(
    stripHtmlTags(String(value ?? ""))
      .toLowerCase()
      .replace(/[_-]+/g, " ")
      .replace(/[^\p{L}\p{N}\s.]/gu, " ")
      .replace(/\s+/g, " ")
      .trim(),
  );
}

function compactAdminSearchText(value: string): string {
  return value.replace(/[\s._-]+/g, "");
}

/** Split a query into lowercase tokens; ignores extra spaces. */
export function tokenizeAdminSearchQuery(filterValue: unknown): string[] {
  return normalizeAdminSearchText(filterValue).split(" ").filter(Boolean);
}

export function parseAdminSearchQuery(filterValue: unknown): {
  phrases: string[];
  tokens: string[];
} {
  const raw = String(filterValue ?? "").trim();
  if (!raw) return { phrases: [], tokens: [] };

  const phrases: string[] = [];
  let remainder = raw;
  const phrasePattern = /"([^"]+)"/g;

  for (const match of raw.matchAll(phrasePattern)) {
    const phrase = normalizeAdminSearchText(match[1]);
    if (phrase) phrases.push(phrase);
    remainder = remainder.replace(match[0], " ");
  }

  return {
    phrases,
    tokens: tokenizeAdminSearchQuery(remainder),
  };
}

function expandBadgeSearchValues(badge: unknown): string[] {
  if (badge == null || badge === "") return [];
  const raw = String(badge);
  const normalized = normalizeAdminSearchText(raw.replace(/_/g, " "));
  const alias = BADGE_SEARCH_ALIASES[raw];
  return [raw, normalized, alias].filter(Boolean);
}

function expandFeaturedSearchValues(featured: unknown): string[] {
  if (featured == null) return [];
  if (featured === true) return ["featured", "yes", "true"];
  if (featured === false) return ["not featured", "no", "false"];
  return [String(featured)];
}

function expandPriceSearchValues(price: unknown): string[] {
  if (price == null || price === "") return [];
  const raw = String(price).trim();
  const numeric = raw.replace(/[^\d.]/g, "");
  const values = [raw, numeric];
  const [whole = "", fraction = ""] = numeric.split(".");
  if (whole) values.push(whole);
  if (fraction && fraction !== "00") values.push(`${whole}.${fraction}`);
  return [...new Set(values.filter(Boolean))];
}

function expandSlugSearchValues(slug: unknown): string[] {
  if (slug == null || slug === "") return [];
  const raw = String(slug);
  const normalized = normalizeAdminSearchText(raw);
  const compact = compactAdminSearchText(normalized);
  return [raw, normalized, compact].filter(Boolean);
}

/** When the whole query looks like a product code (ST…). */
export function isProductCodeSearchQuery(filterValue: unknown): boolean {
  const raw = String(filterValue ?? "").trim();
  return /^ST[_-]?0*\d+$/i.test(raw);
}

/** Normalize ST_01, ST00001, ST000001, etc. to ST000001. */
export function parseCanonicalProductCode(value: unknown): string | null {
  const raw = String(value ?? "").trim();
  if (!raw) return null;

  const upper = raw.toUpperCase();
  const match = upper.match(/^ST[_-]?0*(\d+)$/);
  if (!match) return null;

  const num = Number.parseInt(match[1], 10);
  if (!Number.isFinite(num) || num < 0) return null;

  return `ST${String(num).padStart(6, "0")}`;
}

function collectProductCodeCandidates(
  product: AdminProductSearchNode,
): string[] {
  const candidates: string[] = [];

  if (product.productCode) candidates.push(product.productCode);

  const nameCode = product.name?.match(/\bST[_-]?0*\d+\b/i)?.[0];
  if (nameCode) candidates.push(nameCode);

  const slugCode = product.slug?.match(/st[_-]?0*\d+/i)?.[0];
  if (slugCode) candidates.push(slugCode);

  return candidates;
}

export function matchesAdminProductCodeSearch(
  row: { node: AdminProductSearchNode },
  filterValue: unknown,
): boolean {
  const queryCanonical = parseCanonicalProductCode(filterValue);
  if (!queryCanonical) return false;

  for (const candidate of collectProductCodeCandidates(row.node)) {
    const rowCanonical = parseCanonicalProductCode(candidate);
    if (rowCanonical === queryCanonical) return true;
  }

  return false;
}

export function matchesAdminProductTableSearch(
  row: { node: AdminProductSearchNode },
  filterValue: unknown,
): boolean {
  const query = String(filterValue ?? "").trim();
  if (!query) return true;

  if (isProductCodeSearchQuery(query)) {
    return matchesAdminProductCodeSearch(row, query);
  }

  return matchesAdminTableSearch(buildAdminProductSearchText(row), query);
}

export function buildAdminSearchHaystack(values: Array<unknown>): string {
  return normalizeAdminSearchText(
    values
      .flatMap((value) => {
        if (value == null) return [];
        if (Array.isArray(value)) return value.map(String);
        if (typeof value === "number" || typeof value === "boolean") {
          return [String(value)];
        }
        return [String(value)];
      })
      .join(" "),
  );
}

function tokenMatchesHaystack(token: string, haystack: string): boolean {
  if (!token) return true;
  if (haystack.includes(token)) return true;

  if (token.length >= 3) {
    const compactHaystack = compactAdminSearchText(haystack);
    const compactToken = compactAdminSearchText(token);
    if (compactToken && compactHaystack.includes(compactToken)) return true;
  }

  return false;
}

/**
 * Match admin table rows using quoted phrases + AND token search.
 * - `"silk saree"` requires that exact phrase
 * - `silk kanchi` requires both words anywhere in the row
 */
export function matchesAdminTableSearch(
  haystack: string,
  filterValue: unknown,
): boolean {
  const normalizedHaystack = normalizeAdminSearchText(haystack);
  const { phrases, tokens } = parseAdminSearchQuery(filterValue);

  if (phrases.length === 0 && tokens.length === 0) return true;

  const phrasesMatch = phrases.every((phrase) =>
    normalizedHaystack.includes(phrase),
  );
  const tokensMatch = tokens.every((token) =>
    tokenMatchesHaystack(token, normalizedHaystack),
  );

  return phrasesMatch && tokensMatch;
}

export function createAdminTableGlobalFilter<TData>(
  getSearchText: (row: TData) => string,
): FilterFn<TData> {
  return (row, _columnId, filterValue) =>
    matchesAdminTableSearch(getSearchText(row.original), filterValue);
}

export function createAdminProductTableGlobalFilter<TData>(): FilterFn<TData> {
  return (row, _columnId, filterValue) =>
    matchesAdminProductTableSearch(
      row.original as { node: AdminProductSearchNode },
      filterValue,
    );
}

export type AdminProductSearchNode = {
  id?: string | null;
  name?: string | null;
  description?: string | null;
  slug?: string | null;
  productCode?: string | null;
  badge?: string | null;
  price?: string | number | null;
  stock?: number | null;
  rating?: string | number | null;
  featured?: boolean | null;
  isDraft?: boolean | null;
  collections?: {
    label?: string | null;
    slug?: string | null;
    title?: string | null;
  } | null;
};

function expandDraftSearchValues(isDraft: unknown): string[] {
  if (isDraft === true) return ["draft", "unpublished"];
  if (isDraft === false) return ["published", "live"];
  return [];
}

export function buildAdminProductSearchText(row: {
  node: AdminProductSearchNode;
}): string {
  const product = row.node;
  const collection = product.collections;

  return buildAdminSearchHaystack([
    product.id,
    product.productCode,
    product.name,
    product.description,
    ...expandSlugSearchValues(product.slug),
    ...expandBadgeSearchValues(product.badge),
    ...expandPriceSearchValues(product.price),
    product.stock,
    product.rating,
    ...expandFeaturedSearchValues(product.featured),
    ...expandDraftSearchValues(product.isDraft),
    collection?.label,
    ...expandSlugSearchValues(collection?.slug),
    collection?.title,
  ]);
}

export type AdminCollectionSearchNode = {
  id?: string | null;
  label?: string | null;
  title?: string | null;
  slug?: string | null;
  description?: string | null;
};

export function buildAdminCollectionSearchText(row: {
  node: AdminCollectionSearchNode;
}): string {
  const collection = row.node;

  return buildAdminSearchHaystack([
    collection.id,
    collection.label,
    collection.title,
    ...expandSlugSearchValues(collection.slug),
    collection.description,
  ]);
}

export function filterAdminProductTableRows<
  T extends { node: AdminProductSearchNode },
>(rows: T[], filterValue: unknown): T[] {
  const query = String(filterValue ?? "").trim();
  if (!query) return rows;
  return rows.filter((row) => matchesAdminProductTableSearch(row, query));
}

export function filterAdminCollectionTableRows<
  T extends { node: AdminCollectionSearchNode },
>(rows: T[], filterValue: unknown): T[] {
  const query = String(filterValue ?? "").trim();
  if (!query) return rows;
  return rows.filter((row) =>
    matchesAdminTableSearch(buildAdminCollectionSearchText(row), query),
  );
}

export function selectAllFilteredRows<TData>(
  table: {
    getFilteredRowModel: () => { rows: Array<{ id: string }> };
  },
  onChange: (selection: Record<string, boolean>) => void,
) {
  const selection: Record<string, boolean> = {};
  for (const row of table.getFilteredRowModel().rows) {
    selection[row.id] = true;
  }
  onChange(selection);
}
