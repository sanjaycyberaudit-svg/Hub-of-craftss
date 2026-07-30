jest.mock("./redis", () => ({
  redisGet: jest.fn(async () => null),
  redisSet: jest.fn(async () => undefined),
}));

jest.mock("next/cache", () => ({
  unstable_cache: (fn: (...args: unknown[]) => unknown) => fn,
}));

import {
  clearStorefrontMemoryCache,
  withStorefrontCache,
} from "./storefront-cache";

describe("withStorefrontCache", () => {
  beforeEach(() => {
    clearStorefrontMemoryCache();
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
});
