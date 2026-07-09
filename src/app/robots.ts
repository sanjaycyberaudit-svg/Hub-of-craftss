import type { MetadataRoute } from "next";
import { getURL } from "@/lib/utils";

export default function robots(): MetadataRoute.Robots {
  const base = getURL();

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin/",
          "/api/",
          "/sign-in",
          "/sign-up",
          "/setting/",
          "/orders/",
        ],
      },
    ],
    sitemap: `${base}sitemap.xml`,
    host: base.slice(0, -1),
  };
}
