import type { AdminTableSearchConfig } from "@/components/admin/AdminTableSearch";

export const ADMIN_PRODUCTS_SEARCH: AdminTableSearchConfig = {
  entityLabel: "products",
  placeholder: "Search by code (ST000001), name, category, draft...",
  emptyResultHint: "try ST000001, product name, or draft",
};

export const ADMIN_COLLECTIONS_SEARCH: AdminTableSearchConfig = {
  entityLabel: "categories",
  placeholder: 'Search by category name — try: kanchi, "wedding saree"...',
  emptyResultHint: "try the category name or description",
};
