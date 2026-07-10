import { siteConfig } from "@/config/site";

export type HeroSlide = {
  id: string;
  title: string;
  subtitle: string;
  href: string;
  cta: string;
  image: string;
  imageAlt: string;
};

/** Homepage hero fallback until Admin → Home Banner uploads craft photos. */
export const heroSlides: HeroSlide[] = [
  {
    id: "terracotta",
    title: "Terracotta materials",
    subtitle: "Raw materials for jewellery and craft projects",
    href: "/shop",
    cta: "Shop now",
    image: "/images/hub-of-craftss-logo.png",
    imageAlt: `${siteConfig.name} — terracotta craft supplies`,
  },
  {
    id: "art-supplies",
    title: "Art & craft supplies",
    subtitle: "Make · Craft · Create with quality supplies",
    href: "/collections",
    cta: "Explore",
    image: "/images/hub-of-craftss-logo.png",
    imageAlt: `${siteConfig.name} — art and craft supplies`,
  },
  {
    id: "madurai-hub",
    title: "From Madurai",
    subtitle: "Hub of craftss by Shaaru — Sarojini Nagar",
    href: "/about",
    cta: "Our story",
    image: "/images/hub-of-craftss-logo.png",
    imageAlt: `${siteConfig.name} — Madurai craft shop`,
  },
];
