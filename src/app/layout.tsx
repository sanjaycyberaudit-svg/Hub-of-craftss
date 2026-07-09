import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { siteConfig } from "@/config/site";
import { brandSans, heroSerif } from "@/lib/fonts";
import { getURL } from "@/lib/utils";
import CustomProvider from "../providers/CustomProvider";

const inter = Inter({ subsets: ["latin"] });
const siteUrl = getURL();

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "SRI SAI RAGHAVENDRA TEX | Silk & Cotton Sarees",
    template: "%s | SRI SAI RAGHAVENDRA TEX",
  },
  description: siteConfig.description,
  keywords: [
    "SRI SAI RAGHAVENDRA TEX",
    "SSR Tex",
    "silk sarees",
    "cotton sarees",
    "Kanjivaram sarees",
    "wedding sarees",
    "Salem saree shop",
    "Elampillai sarees",
    "wholesale sarees",
  ],
  applicationName: siteConfig.name,
  authors: [{ name: siteConfig.name }],
  creator: siteConfig.name,
  publisher: siteConfig.name,
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
    title: "SRI SAI RAGHAVENDRA TEX | Silk & Cotton Sarees",
    description: siteConfig.description,
  },
  twitter: {
    card: "summary_large_image",
    title: "SRI SAI RAGHAVENDRA TEX | Silk & Cotton Sarees",
    description: siteConfig.description,
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
  icons: {
    icon: [{ url: "/images/ssr-tex-emblem.svg", type: "image/svg+xml" }],
    shortcut: ["/images/ssr-tex-emblem.svg"],
    apple: [{ url: "/images/ssr-tex-emblem.svg", type: "image/svg+xml" }],
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
          className={`${inter.className} ${brandSans.variable} ${heroSerif.variable}`}
        >
          {children}
          <Toaster />
        </body>
      </CustomProvider>
    </html>
  );
}
