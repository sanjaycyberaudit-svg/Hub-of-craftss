import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { siteConfig } from "@/config/site";
import { MicrosoftClarity } from "@/components/analytics/MicrosoftClarity";
import { WebViewErrorNoiseFilter } from "@/components/analytics/WebViewErrorNoiseFilter";
import { brandSans, heroSerif } from "@/lib/fonts";
import { SEO_BRAND_ASSETS } from "@/lib/seo/brand-assets";
import { getURL } from "@/lib/utils";
import CustomProvider from "../providers/CustomProvider";

const siteUrl = getURL();
const brandTitle = `${siteConfig.name} | ${siteConfig.tagline}`;

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: brandTitle,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  keywords: [
    "Hub of craftss",
    "Hubs of craftss",
    "HOC",
    "terracotta supplies Madurai",
    "art and craft supplies",
    "craft materials Madurai",
    "Shaaru crafts",
    "kolam stamp",
    "clay cutter",
    "make craft create",
  ],
  applicationName: siteConfig.name,
  authors: [{ name: siteConfig.name }],
  creator: siteConfig.name,
  publisher: siteConfig.name,
  category: "shopping",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: siteUrl,
    siteName: siteConfig.name,
    title: brandTitle,
    description: siteConfig.description,
    images: [
      {
        url: SEO_BRAND_ASSETS.ogShare,
        width: 1200,
        height: 630,
        alt: `${siteConfig.name} — ${siteConfig.tagline}`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: brandTitle,
    description: siteConfig.description,
    images: [SEO_BRAND_ASSETS.ogShare],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  alternates: {
    canonical: siteUrl,
  },
  // Prefer square brand icons — wide logo PNGs render poorly as Google favicons.
  icons: {
    icon: [
      { url: SEO_BRAND_ASSETS.icon32, sizes: "32x32", type: "image/png" },
      { url: SEO_BRAND_ASSETS.icon48, sizes: "48x48", type: "image/png" },
      { url: SEO_BRAND_ASSETS.icon192, sizes: "192x192", type: "image/png" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    shortcut: [SEO_BRAND_ASSETS.icon48],
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <CustomProvider>
        <body
          className={`${brandSans.className} ${brandSans.variable} ${heroSerif.variable}`}
        >
          {children}
          <Toaster />
          <WebViewErrorNoiseFilter />
          <MicrosoftClarity />
        </body>
      </CustomProvider>
    </html>
  );
}
