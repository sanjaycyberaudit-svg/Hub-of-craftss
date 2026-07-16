import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const shippingLabelPdf = path.resolve(
  __dirname,
  "src/lib/pdf/shipping-label-pdf.ts",
);
const shippingLabelPdfStub = path.resolve(
  __dirname,
  "src/lib/pdf/shipping-label-pdf.stub.ts",
);

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  productionBrowserSourceMaps: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
        ],
      },
    ];
  },
  images: {
    formats: ["image/avif", "image/webp"],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 320, 384, 400],
    remotePatterns: [
      // Demo images (HiyoRi default S3)
      {
        protocol: "https",
        hostname: "hiyori-backpack.s3.us-west-2.amazonaws.com",
      },
      // Your S3 bucket when configured in .env.local
      ...(process.env.NEXT_PUBLIC_S3_BUCKET &&
      process.env.NEXT_PUBLIC_S3_BUCKET !== "placeholder"
        ? [
            {
              protocol: "https",
              hostname: `${process.env.NEXT_PUBLIC_S3_BUCKET}.s3.${process.env.NEXT_PUBLIC_S3_REGION || "ap-south-1"}.amazonaws.com`,
            },
          ]
        : []),
      ...(process.env.NEXT_PUBLIC_SUPABASE_URL
        ? [
            {
              protocol: "https",
              hostname: new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname,
              pathname: "/storage/v1/object/public/**",
            },
          ]
        : []),
      ...(process.env.NEXT_PUBLIC_CDN_URL
        ? [
            {
              protocol: "https",
              hostname: new URL(process.env.NEXT_PUBLIC_CDN_URL).hostname,
              pathname: "/**",
            },
          ]
        : []),
      {
        protocol: "https",
        hostname: "source.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "images.pexels.com",
      },
      {
        protocol: "https",
        hostname: "placehold.co",
      },
      {
        protocol: "https",
        hostname: "img.youtube.com",
      },
      {
        protocol: "https",
        hostname: "vumbnail.com",
      },
      // Legacy Workers hosts (seeded absolute image URLs) + current account subdomain
      {
        protocol: "https",
        hostname: "hub-of-craftss.hubofcraftss.workers.dev",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "hub-of-craftss.shaarunew01.workers.dev",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "hubsofcraftss.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "www.hubsofcraftss.com",
        pathname: "/**",
      },
    ],
  },
  experimental: {
    // (Next 15+) moved to top-level `serverExternalPackages`.
    // Always refetch dynamic routes (e.g. admin dashboard) when navigating
    // back to them, instead of replaying the stale client Router Cache.
    staleTimes: {
      dynamic: 0,
      static: 180,
    },
  },
  // Keep browser-only PDF out of the Next server graph (Workers Free 3 MiB).
  serverExternalPackages: ["jspdf", "stripe"],
  webpack: (config, { isServer }) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      // Drop unused OG image WASM from the server Worker bundle.
      "next/og": false,
      ...(isServer
        ? {
            jspdf: false,
            // Shipping-label PDF + jsPDF are browser-only; stub on SSR/Worker.
            [shippingLabelPdf]: shippingLabelPdfStub,
          }
        : {}),
    };
    return config;
  },
};

export default nextConfig;

initOpenNextCloudflareForDev();
