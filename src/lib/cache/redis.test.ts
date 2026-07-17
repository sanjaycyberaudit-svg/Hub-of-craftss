import { redisGet, redisSet } from "./redis";

type FetchMock = jest.Mock & { _nextOriginalFetch?: jest.Mock };

function jsonResponse(payload: unknown) {
  return {
    ok: true,
    status: 200,
    json: async () => payload,
    text: async () => JSON.stringify(payload),
  };
}

describe("redis REST cache client", () => {
  const originalFetch = globalThis.fetch;
  const originalUrl = process.env.UPSTASH_REDIS_REST_URL;
  const originalToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  beforeEach(() => {
    process.env.UPSTASH_REDIS_REST_URL = "https://example.upstash.io";
    process.env.UPSTASH_REDIS_REST_TOKEN = "test-token";
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    process.env.UPSTASH_REDIS_REST_URL = originalUrl;
    process.env.UPSTASH_REDIS_REST_TOKEN = originalToken;
    jest.restoreAllMocks();
  });

  it("uses Next's unpatched fetch when the global fetch is patched", async () => {
    const unpatched = jest
      .fn()
      .mockResolvedValue(jsonResponse({ result: null }));
    const patched: FetchMock = jest.fn();
    patched._nextOriginalFetch = unpatched;
    globalThis.fetch = patched as unknown as typeof fetch;

    await redisGet("sf:test");

    expect(unpatched).toHaveBeenCalledTimes(1);
    expect(patched).not.toHaveBeenCalled();
  });

  it("never passes a cache option to fetch (static-render safe)", async () => {
    const mock = jest.fn().mockResolvedValue(jsonResponse({ result: null }));
    globalThis.fetch = mock as unknown as typeof fetch;

    await redisGet("sf:test");

    const [, init] = mock.mock.calls[0] as [string, RequestInit];
    expect("cache" in init).toBe(false);
  });

  it("round-trips JSON values like @upstash/redis", async () => {
    const stored: Record<string, string> = {};
    const mock = jest.fn(async (_url: string, init: RequestInit) => {
      const command = JSON.parse(String(init.body)) as string[];
      if (command[0] === "SET") {
        stored[command[1]] = command[2];
        return jsonResponse({ result: "OK" });
      }
      return jsonResponse({ result: stored[command[1]] ?? null });
    });
    globalThis.fetch = mock as unknown as typeof fetch;

    const value = { edges: [{ node: { id: "1", label: "Toys" } }] };
    await redisSet("sf:collection:list", value, 120);
    const roundTripped = await redisGet<typeof value>("sf:collection:list");

    expect(roundTripped).toEqual(value);

    const setCommand = JSON.parse(
      String((mock.mock.calls[0] as [string, RequestInit])[1].body),
    );
    expect(setCommand).toEqual([
      "SET",
      "sf:collection:list",
      JSON.stringify(value),
      "EX",
      120,
    ]);
  });

  it("returns null instead of throwing when Redis errors", async () => {
    const mock = jest.fn().mockRejectedValue(new Error("network down"));
    globalThis.fetch = mock as unknown as typeof fetch;
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});

    await expect(redisGet("sf:test")).resolves.toBeNull();
    await expect(redisSet("sf:test", { a: 1 }, 60)).resolves.toBeUndefined();
    expect(warn).toHaveBeenCalled();
  });
});
