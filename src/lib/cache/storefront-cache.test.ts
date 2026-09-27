const mockRedisStore = new Map<string, unknown>();
let mockRedisEnabled = false;

jest.mock("./redis", () => ({
  isRedisCacheEnabled: jest.fn(() => mockRedisEnabled),
  redisGet: jest.fn(async (key: string) =>
    mockRedisEnabled ? mockRedisStore.get(key) ?? null : null,
  ),
  redisSet: jest.fn(async (key: string, value: unknown) => {
    if (mockRedisEnabled) mockRedisStore.set(key, value);
  }),
}));

jest.mock("next/cache", () => ({
  unstable_cache: (fn: (...args: unknown[]) => unknown) => fn,
}));

import { redisGet } from "./redis";
import {
  clearStorefrontMemoryCache,
  withStorefrontCache,
} from "./storefront-cache";

describe("withStorefrontCache", () => {
  beforeEach(() => {
    clearStorefrontMemoryCache();
    mockRedisStore.clear();
    mockRedisEnabled = false;
    jest.mocked(redisGet).mockClear();
    jest.spyOn(console, "error").mockImplementation(() => {});
    jest.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("serves the last known-good value when the loader fails", async () => {
    const key = `test:stale:${Math.random()}`;
    let mode: "ok" | "fail" = "ok";

    const loader = jest.fn(async () => {
      if (mode === "fail") throw new Error("connection terminated");
      return { items: [1, 2, 3] };
    });

    const first = await withStorefrontCache(key, loader, { revalidate: 0 });
    expect(first).toEqual({ items: [1, 2, 3] });

    mode = "fail";
    const second = await withStorefrontCache(key, loader, { revalidate: 0 });

    // Fresh read failed, so the previous payload is reused instead of throwing.
    expect(second).toEqual({ items: [1, 2, 3] });
  });

  it("propagates the error when no cached value exists", async () => {
    const key = `test:cold:${Math.random()}`;

    await expect(
      withStorefrontCache(
        key,
        async () => {
          throw new Error("relation does not exist");
        },
        { revalidate: 0 },
      ),
    ).rejects.toThrow("relation does not exist");
  });

  it("reuses a fresh value without calling the loader again", async () => {
    const key = `test:fresh:${Math.random()}`;
    const loader = jest.fn(async () => "value");

    await withStorefrontCache(key, loader, { revalidate: 120 });
    const second = await withStorefrontCache(key, loader, { revalidate: 120 });

    expect(second).toBe("value");
    expect(loader).toHaveBeenCalledTimes(1);
  });

  describe("with shared Redis", () => {
    beforeEach(() => {
      mockRedisEnabled = true;
    });

    it("serves the isolate copy without a Redis round trip for a short window", async () => {
      const key = `test:trust:${Math.random()}`;
      const loader = jest.fn(async () => "v1");

      await withStorefrontCache(key, loader, { revalidate: 1800 });
      jest.mocked(redisGet).mockClear();
      const second = await withStorefrontCache(key, loader, {
        revalidate: 1800,
      });

      expect(second).toBe("v1");
      expect(loader).toHaveBeenCalledTimes(1);
      expect(redisGet).not.toHaveBeenCalled();
    });

    it("picks up an admin invalidation made on another instance within seconds", async () => {
      const key = `test:invalidate:${Math.random()}`;
      let version = "old";
      const loader = jest.fn(async () => version);
      const start = Date.now();
      const now = jest.spyOn(Date, "now").mockReturnValue(start);

      await withStorefrontCache(key, loader, { revalidate: 1800 });

      // Another instance saved in admin: Redis cleared, this isolate's memory not.
      mockRedisStore.clear();
      version = "new";

      now.mockReturnValue(start + 5_000);
      expect(await withStorefrontCache(key, loader, { revalidate: 1800 })).toBe(
        "old",
      );

      now.mockReturnValue(start + 16_000);
      expect(await withStorefrontCache(key, loader, { revalidate: 1800 })).toBe(
        "new",
      );
      expect(loader).toHaveBeenCalledTimes(2);
    });

    it("keeps using a still-valid Redis entry after the memory window", async () => {
      const key = `test:recheck:${Math.random()}`;
      const loader = jest.fn(async () => "v1");
      const start = Date.now();
      const now = jest.spyOn(Date, "now").mockReturnValue(start);

      await withStorefrontCache(key, loader, { revalidate: 1800 });
      now.mockReturnValue(start + 16_000);
      expect(await withStorefrontCache(key, loader, { revalidate: 1800 })).toBe(
        "v1",
      );
      expect(loader).toHaveBeenCalledTimes(1);
    });

    it("falls back to the isolate copy when the reload fails after invalidation", async () => {
      const key = `test:invalidate-fail:${Math.random()}`;
      let fail = false;
      const loader = jest.fn(async () => {
        if (fail) throw new Error("connection terminated");
        return "old";
      });
      const start = Date.now();
      const now = jest.spyOn(Date, "now").mockReturnValue(start);

      await withStorefrontCache(key, loader, { revalidate: 1800 });
      mockRedisStore.clear();
      fail = true;
      now.mockReturnValue(start + 16_000);

      expect(await withStorefrontCache(key, loader, { revalidate: 1800 })).toBe(
        "old",
      );
    });
  });
});
