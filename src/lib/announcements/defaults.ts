import { siteConfig } from "@/config/site";
import type { StorefrontAnnouncement } from "@/lib/announcements/types";

export function getDefaultAnnouncementLines(): StorefrontAnnouncement[] {
  return siteConfig.announcements.map((item, index) => ({
    id: `line-${index + 1}`,
    text: item.text,
    href: item.href,
    cta: item.cta,
  }));
}
