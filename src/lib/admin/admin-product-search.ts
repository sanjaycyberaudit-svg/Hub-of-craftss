/**
 * Escape LIKE wildcards, then treat spaces / hyphens / underscores as flexible
 * gaps so "A line" matches "A-LINE kolam stamp".
 */
export function buildAdminProductSearchPattern(query: string): string {
  const trimmed = query.trim();
  if (!trimmed) return "";
  const parts = trimmed
    .split(/[\s\-_]+/)
    .filter(Boolean)
    .map((part) => part.replace(/[%_]/g, "\\$&"));
  if (parts.length === 0) return "";
  if (parts.length === 1) return `%${parts[0]}%`;
  return `%${parts.join("%")}%`;
}
