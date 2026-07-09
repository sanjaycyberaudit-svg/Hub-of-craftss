import type { NavItemWithOptionalChildren } from "@/types";

export type SiteConfig = typeof siteConfig;

/** Business card — SRI SAI RAGHAVENDRA TEX (SSR Tex) */
const ADDRESS_LINES = [
  "Chettiyar Street, Perumal Kovil Opp. Road",
  "Elampillai – Kadayampatty",
  "Elampillai, Salem – 637 502",
] as const;

/** Proprietors / contact persons from the business card */
const CONTACTS = [
  {
    name: "J. Moulee",
    phone: "+91 80127 15132",
    phoneHref: "tel:+918012715132",
  },
  {
    name: "J. Vimal",
    phone: "+91 95667 84543",
    phoneHref: "tel:+919566784543",
  },
] as const;

const PHONE = CONTACTS[0].phone;
const PHONE_HREF = CONTACTS[0].phoneHref;
const EMAIL = "";
const GSTIN = "33BMCPV3652G1Z1";

const SOCIAL = {
  instagram: "",
  youtube: "",
  facebook: "",
  whatsapp: "https://wa.me/918012715132",
} as const;

export const siteConfig = {
  /** Title-case shop board line (navbar/footer wordmark) */
  shopBoardName: "Sri Sai Raghavendra Tex",
  name: "SRI SAI RAGHAVENDRA TEX®",
  shortName: "SSR Tex",
  tagline: "Sarees Wholesale & Retail Merchant",
  /** Town shown on shop board / navbar */
  location: "ELAMPILLAI",
  description: "Sarees wholesale & retail merchant — silk and cotton sarees",
  searchPlaceholder: "Search silk & cotton sarees, collections…",
  url: "https://www.sairaghavendratex.com",
  addressLines: ADDRESS_LINES,
  /** Single-line address for compact UI */
  address: ADDRESS_LINES.join(", "),
  phone: PHONE,
  /** `tel:` href (digits only, with country code) */
  phoneHref: PHONE_HREF,
  /** All proprietors / contact numbers from the business card */
  contacts: CONTACTS,
  email: EMAIL,
  gstin: GSTIN,
  currency: "INR",
  currencySymbol: "₹",
  /** Update with your real profile URLs */
  social: SOCIAL,
  /** Top offer ribbon — rotates on the storefront */
  announcements: [
    {
      text: "Premium silk & cotton sarees — wholesale & retail at SRI SAI RAGHAVENDRA TEX",
      href: "/shop",
      cta: "Shop now",
    },
    {
      text: "Visit our store in Salem · Call for orders & enquiries",
      href: "tel:+917708069049",
      cta: "Call us",
    },
    {
      text: "Explore Kanjivaram, wedding & festive collections",
      href: "/collections",
      cta: "View all",
    },
  ],
  mainNav: [
    {
      title: "Collections",
      href: "/collections",
      description: "Browse saree collections.",
      items: [],
    },
    {
      title: "Featured",
      href: "/featured",
      description: "Handpicked sarees.",
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
        { title: "All sarees", href: "/shop", items: [] },
        { title: "Featured sarees", href: "/featured", items: [] },
        { title: "All categories", href: "/collections", items: [] },
        { title: "Wishlist", href: "/wish-list", items: [] },
        { title: "Cart", href: "/cart", items: [] },
      ],
    },
    {
      title: "Collections",
      items: [
        {
          title: "Kanjivaram Wedding",
          href: "/collections/kanjivaram-wedding-sarees",
          items: [],
        },
        {
          title: "Cotton Sarees",
          href: "/collections/cotton-sarees",
          items: [],
        },
        {
          title: "Soft Silk Sarees",
          href: "/collections/soft-silk-sarees",
          items: [],
        },
        {
          title: "Wedding Collections",
          href: "/collections/wedding-collections",
          items: [],
        },
        {
          title: "Traditional Silk",
          href: "/collections/traditional-silk-sarees",
          items: [],
        },
        { title: "View all categories", href: "/collections", items: [] },
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
      title: "About SRI SAI RAGHAVENDRA TEX",
      items: [
        { title: "Our Story", href: "/about", items: [] },
        { title: "Our Collections", href: "/collections", items: [] },
        { title: "Visit our store", href: "/contact#store", items: [] },
        { title: "Contact", href: "/contact", items: [] },
      ],
    },
  ] satisfies NavItemWithOptionalChildren[],
};
