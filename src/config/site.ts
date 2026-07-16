import type { NavItemWithOptionalChildren } from "@/types";

export type SiteConfig = typeof siteConfig;

/** Hub of craftss — Madurai */
const ADDRESS_LINES = [
  "No 162, Kasim Residency",
  "Sarojini Nagar",
  "Madurai – 625107, Tamil Nadu",
] as const;

/** Contacts — add phone/WhatsApp when available */
const CONTACTS = [
  {
    name: "Shaaru",
    phone: "",
    phoneHref: "",
  },
] as const;

const PHONE = CONTACTS[0].phone;
const PHONE_HREF = CONTACTS[0].phoneHref;
const EMAIL = "";
const GSTIN = "";

const SOCIAL = {
  instagram: "https://www.instagram.com/hub_of_craftss_by_shaaru/",
  youtube: "",
  facebook: "",
  whatsapp: "",
} as const;

export const siteConfig = {
  /** Title-case shop board line (navbar/footer wordmark) */
  shopBoardName: "Hub of craftss",
  name: "Hub of craftss",
  shortName: "HOC",
  tagline: "Make · Craft · Create",
  /** Town shown on shop board / navbar */
  location: "MADURAI",
  description:
    "Terracotta raw materials and art & craft supplies — make, craft, create with Hub of craftss by Shaaru.",
  searchPlaceholder: "Search craft supplies, terracotta, collections…",
  url: "https://hubsofcraftss.com",
  addressLines: ADDRESS_LINES,
  /** Single-line address for compact UI */
  address: ADDRESS_LINES.join(", "),
  phone: PHONE,
  /** `tel:` href (digits only, with country code) */
  phoneHref: PHONE_HREF,
  /** All proprietors / contact numbers */
  contacts: CONTACTS,
  email: EMAIL,
  gstin: GSTIN,
  currency: "INR",
  currencySymbol: "₹",
  social: SOCIAL,
  /** Top offer ribbon — rotates on the storefront */
  announcements: [
    {
      text: "Terracotta raw materials & art craft supplies — Make · Craft · Create",
      href: "/shop",
      cta: "Shop now",
    },
    {
      text: "Follow @hub_of_craftss_by_shaaru for new arrivals",
      href: "https://www.instagram.com/hub_of_craftss_by_shaaru/",
      cta: "Instagram",
    },
    {
      text: "Visit us in Madurai · Sarojini Nagar",
      href: "/contact",
      cta: "Contact",
    },
  ],
  mainNav: [
    {
      title: "Collections",
      href: "/collections",
      description: "Browse craft collections.",
      items: [],
    },
    {
      title: "Featured",
      href: "/featured",
      description: "Handpicked craft supplies.",
      items: [],
    },
    {
      title: "Orders",
      href: "/orders",
      description: "Your orders.",
      items: [],
    },
  ] satisfies NavItemWithOptionalChildren[],

  /** Storefront footer columns */
  footerNav: [
    {
      title: "Shop",
      items: [
        { title: "All products", href: "/shop", items: [] },
        { title: "Featured", href: "/featured", items: [] },
        { title: "All categories", href: "/collections", items: [] },
        { title: "Wishlist", href: "/wish-list", items: [] },
        { title: "Cart", href: "/cart", items: [] },
      ],
    },
    {
      title: "Explore",
      items: [
        { title: "Collections", href: "/collections", items: [] },
        { title: "Featured picks", href: "/featured", items: [] },
        { title: "Our story", href: "/about", items: [] },
        { title: "Contact", href: "/contact", items: [] },
      ],
    },
    {
      title: "Customer Service",
      items: [
        {
          title: "Terms & Conditions",
          href: "/terms-and-conditions",
          items: [],
        },
        { title: "Terms of Use", href: "/terms-of-use", items: [] },
        { title: "Privacy Policy", href: "/privacy-policy", items: [] },
        { title: "Shipping & Returns", href: "/shipping-returns", items: [] },
        { title: "Payment Methods", href: "/payment-methods", items: [] },
        { title: "FAQ", href: "/faq", items: [] },
        { title: "My orders", href: "/orders", items: [] },
      ],
    },
    {
      title: "About Hub of craftss",
      items: [
        { title: "Our Story", href: "/about", items: [] },
        { title: "Our Collections", href: "/collections", items: [] },
        { title: "Visit our store", href: "/contact#store", items: [] },
        { title: "Contact", href: "/contact", items: [] },
        {
          title: "Instagram",
          href: "https://www.instagram.com/hub_of_craftss_by_shaaru/",
          items: [],
        },
      ],
    },
  ] satisfies NavItemWithOptionalChildren[],
};
