import {
  SOCIAL_IMAGE_FALLBACK_PATH,
  absoluteSocialFallbackUrl,
  buildSocialImages,
  resolveSocialImageUrl,
  type SocialImageResolveDeps,
} from "./social-image";

const deps: SocialImageResolveDeps = {
  siteOrigin: "https://hubsofcraftss.com",
  resolveMediaUrl: (key: string) => {
    if (key.startsWith("http://") || key.startsWith("https://")) return key;
    if (key.startsWith("/")) return key;
    return `https://pub-d036df4365494925a278f4ecf244316d.r2.dev/${key}`;
  },
};

describe("resolveSocialImageUrl", () => {
  it("falls back when key is missing", () => {
    expect(resolveSocialImageUrl(undefined, deps)).toBe(
      `https://hubsofcraftss.com${SOCIAL_IMAGE_FALLBACK_PATH}`,
    );
    expect(resolveSocialImageUrl(null, deps)).toBe(
      absoluteSocialFallbackUrl("https://hubsofcraftss.com"),
    );
    expect(resolveSocialImageUrl("   ", deps)).toBe(
      absoluteSocialFallbackUrl("https://hubsofcraftss.com"),
    );
  });

  it("falls back for uploads keys when media CDN is not configured", () => {
    expect(resolveSocialImageUrl("uploads/banner.png", deps)).toBe(
      absoluteSocialFallbackUrl("https://hubsofcraftss.com"),
    );
  });

  it("uses media CDN when buildCdnSocialUrl is provided", () => {
    const withCdn: SocialImageResolveDeps = {
      ...deps,
      buildCdnSocialUrl: (key) =>
        `https://media.example.test/cdn/w=400,q=75,f=webp/${key}`,
    };
    expect(resolveSocialImageUrl("uploads/banner.png", withCdn)).toBe(
      "https://media.example.test/cdn/w=400,q=75,f=webp/uploads/banner.png",
    );
  });

  it("absolutizes relative non-SVG paths", () => {
    expect(resolveSocialImageUrl("/images/hoc-og-share.jpg", deps)).toBe(
      "https://hubsofcraftss.com/images/hoc-og-share.jpg",
    );
  });

  it("rejects SVG paths", () => {
    expect(resolveSocialImageUrl("/images/logo.svg", deps)).toBe(
      absoluteSocialFallbackUrl("https://hubsofcraftss.com"),
    );
  });

  it("rejects Next image optimizer URLs", () => {
    expect(
      resolveSocialImageUrl(
        "https://hubsofcraftss.com/_next/image?url=%2Fuploads%2Fa.png&w=1200",
        deps,
      ),
    ).toBe(absoluteSocialFallbackUrl("https://hubsofcraftss.com"));
  });

  it("never returns *.r2.dev", () => {
    expect(
      resolveSocialImageUrl(
        "https://pub-d036df4365494925a278f4ecf244316d.r2.dev/uploads/a.png",
        deps,
      ),
    ).toBe(absoluteSocialFallbackUrl("https://hubsofcraftss.com"));
  });

  it("rewrites r2.dev via CDN builder when available", () => {
    const withCdn: SocialImageResolveDeps = {
      ...deps,
      buildCdnSocialUrl: (key) =>
        `https://media.example.test/cdn/w=400,q=75,f=webp/${key}`,
    };
    expect(
      resolveSocialImageUrl(
        "https://pub-d036df4365494925a278f4ecf244316d.r2.dev/uploads/a.png",
        withCdn,
      ),
    ).toBe("https://media.example.test/cdn/w=400,q=75,f=webp/uploads/a.png");
  });
});

describe("buildSocialImages", () => {
  it("returns Metadata-ready openGraph and twitter images", () => {
    const meta = buildSocialImages(
      "/images/hoc-og-share.jpg",
      "Clay cutter",
      deps,
    );
    expect(meta.openGraph?.images).toEqual([
      {
        url: "https://hubsofcraftss.com/images/hoc-og-share.jpg",
        width: 1200,
        height: 630,
        alt: "Clay cutter",
      },
    ]);
    expect(meta.twitter).toEqual({
      card: "summary_large_image",
      images: ["https://hubsofcraftss.com/images/hoc-og-share.jpg"],
    });
  });
});
