export type StorefrontAnnouncement = {
  id: string;
  text: string;
  href: string;
  cta: string;
};

export type ResolvedStorefrontAnnouncements = {
  enabled: boolean;
  items: StorefrontAnnouncement[];
};
