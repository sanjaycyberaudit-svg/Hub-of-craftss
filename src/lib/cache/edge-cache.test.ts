/** @jest-environment node */

const mockCalls: string[] = [];

jest.mock("@vercel/functions", () => ({
  dangerouslyDeleteByTag: jest.fn(async (tags: string[]) => {
    mockCalls.push(`vercel:${tags.join(",")}`);
  }),
}));

import { dangerouslyDeleteByTag } from "@vercel/functions";
import { purgeEdgeCacheTags } from "./edge-cache";

type FetchArgs = [string, RequestInit];

let fetchMock: jest.Mock;
let warnSpy: jest.SpyInstance;

function respond(status: number, body = "{}") {
  return new Response(body, { status });
}

beforeEach(() => {
  mockCalls.length = 0;
  jest.clearAllMocks();
  process.env.CLOUDFLARE_ZONE_ID = "zone-hub";
  process.env.CLOUDFLARE_CACHE_PURGE_TOKEN = "test-purge-token";
  fetchMock = jest.fn(async (url: string, init: RequestInit) => {
    mockCalls.push(
      `cloudflare:${JSON.parse(String(init.body)).tags.join(",")}`,
    );
    return respond(200);
  });
  (globalThis as { _nextOriginalFetch?: unknown })._nextOriginalFetch =
    fetchMock;
  warnSpy = jest.spyOn(console, "warn").mockImplementation(() => undefined);
});

afterEach(() => {
  delete (globalThis as { _nextOriginalFetch?: unknown })._nextOriginalFetch;
  delete process.env.CLOUDFLARE_ZONE_ID;
  delete process.env.CLOUDFLARE_CACHE_PURGE_TOKEN;
  warnSpy.mockRestore();
});

describe("purgeEdgeCacheTags", () => {
  it("purges Vercel before Cloudflare so a Cloudflare refetch gets fresh data", async () => {
    await purgeEdgeCacheTags(["sf-product-p1", "sf-product-lists"]);

    expect(mockCalls).toEqual([
      "vercel:sf-product-p1,sf-product-lists",
      "cloudflare:sf-product-p1,sf-product-lists",
    ]);
  });

  it("calls the zone purge endpoint with the purge token", async () => {
    await purgeEdgeCacheTags(["sf-product-p1"]);

    const [url, init] = fetchMock.mock.calls[0] as FetchArgs;
    expect(url).toBe(
      "https://api.cloudflare.com/client/v4/zones/zone-hub/purge_cache",
    );
    expect(init.method).toBe("POST");
    expect((init.headers as Record<string, string>).Authorization).toBe(
      "Bearer test-purge-token",
    );
    expect(init.cache).toBeUndefined();
  });

  it("dedupes and batches 100 tags per Cloudflare call", async () => {
    const tags = Array.from({ length: 150 }, (_, i) => `sf-product-${i}`);

    await purgeEdgeCacheTags([...tags, ...tags, ""]);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const sizes = fetchMock.mock.calls.map(
      ([, init]: FetchArgs) => JSON.parse(String(init.body)).tags.length,
    );
    expect(sizes).toEqual([100, 50]);
  });

  it("skips Cloudflare when the zone or token is not configured", async () => {
    delete process.env.CLOUDFLARE_CACHE_PURGE_TOKEN;

    await purgeEdgeCacheTags(["sf-product-p1"]);

    expect(dangerouslyDeleteByTag).toHaveBeenCalledTimes(1);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does nothing for an empty tag list", async () => {
    await purgeEdgeCacheTags(["", ""]);

    expect(dangerouslyDeleteByTag).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("retries once on a Cloudflare server error", async () => {
    fetchMock
      .mockResolvedValueOnce(respond(503))
      .mockResolvedValueOnce(respond(200));

    await purgeEdgeCacheTags(["sf-product-p1"]);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it("does not hammer Cloudflare when rate limited, and never throws", async () => {
    fetchMock.mockResolvedValue(respond(429, '{"errors":[{"code":1134}]}'));

    await expect(
      purgeEdgeCacheTags(["sf-product-p1"]),
    ).resolves.toBeUndefined();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("cloudflare purge failed: HTTP 429"),
    );
  });

  it("survives network failures and Vercel purge errors", async () => {
    jest
      .mocked(dangerouslyDeleteByTag)
      .mockRejectedValueOnce(new Error("vercel down"));
    fetchMock.mockRejectedValue(new Error("network down"));

    await expect(
      purgeEdgeCacheTags(["sf-product-p1"]),
    ).resolves.toBeUndefined();

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(warnSpy).toHaveBeenCalledTimes(2);
  });
});
