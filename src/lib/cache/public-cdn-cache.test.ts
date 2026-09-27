/** @jest-environment node */

import { applyPublicCdnCacheHeaders, publicCdnJson } from "./public-cdn-cache";
import { NextResponse } from "next/server";

describe("applyPublicCdnCacheHeaders", () => {
  it("sets shared CDN cache headers and removes vary", () => {
    const response = NextResponse.json({ ok: true });
    response.headers.set("vary", "rsc, next-router-state-tree");

    applyPublicCdnCacheHeaders(response, 300);

    expect(response.headers.get("cache-control")).toBe(
      "public, max-age=0, s-maxage=300, stale-while-revalidate=300",
    );
    expect(response.headers.get("cdn-cache-control")).toBe(
      "public, max-age=300",
    );
    expect(response.headers.get("vary")).toBeNull();
  });

  it("defaults to a short edge cache so admin edits show within about two minutes", () => {
    const response = publicCdnJson({ ok: true });

    expect(response.headers.get("cache-control")).toBe(
      "public, max-age=0, s-maxage=60, stale-while-revalidate=60",
    );
    expect(response.headers.get("cdn-cache-control")).toBe(
      "public, max-age=60",
    );
  });
});
