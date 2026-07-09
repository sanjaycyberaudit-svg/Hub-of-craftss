import type { StorefrontAnnouncement } from "@/lib/announcements/types";

export function parseAnnouncementItems(raw: unknown): StorefrontAnnouncement[] {
  if (!Array.isArray(raw)) return [];

  return raw
    .map((entry, index) => {
      const item = entry as Record<string, unknown>;
      const text = String(item.text ?? "").trim();
      const href = String(item.href ?? "").trim();
      const cta = String(item.cta ?? "").trim();
      const id = String(item.id ?? "").trim() || `line-${index + 1}`;

      if (!text || !href || !cta) return null;

      return { id, text, href, cta } satisfies StorefrontAnnouncement;
    })
    .filter((line): line is StorefrontAnnouncement => Boolean(line));
}
