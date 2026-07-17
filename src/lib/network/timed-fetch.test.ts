import { createTimedFetch } from "./timed-fetch";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("createTimedFetch", () => {
  it("returns a successful response and clears the timeout", async () => {
    const response = { ok: true, status: 200 } as Response;
    const baseFetch = jest.fn().mockResolvedValue(response);
    const timed = createTimedFetch(1_000, baseFetch as unknown as typeof fetch);

    await expect(timed("https://example.test/graphql")).resolves.toBe(response);
    expect(baseFetch).toHaveBeenCalledTimes(1);
  });

  it("aborts when the timeout fires", async () => {
    jest.useFakeTimers();
    const hang = deferred<Response>();
    const baseFetch = jest.fn((_input, init?: RequestInit) => {
      return new Promise<Response>((resolve, reject) => {
        init?.signal?.addEventListener(
          "abort",
          () =>
            reject(Object.assign(new Error("aborted"), { name: "AbortError" })),
          { once: true },
        );
        hang.promise.then(resolve, reject);
      });
    });

    const timed = createTimedFetch(50, baseFetch as unknown as typeof fetch);
    const pending = timed("https://example.test/graphql");
    const expectation = expect(pending).rejects.toMatchObject({
      name: "AbortError",
    });
    await jest.advanceTimersByTimeAsync(50);
    await expectation;
    jest.useRealTimers();
  });

  it("aborts immediately when the caller cancels", async () => {
    const hang = deferred<Response>();
    const baseFetch = jest.fn((_input, init?: RequestInit) => {
      return new Promise<Response>((resolve, reject) => {
        init?.signal?.addEventListener(
          "abort",
          () =>
            reject(Object.assign(new Error("aborted"), { name: "AbortError" })),
          { once: true },
        );
        hang.promise.then(resolve, reject);
      });
    });

    const controller = new AbortController();
    const timed = createTimedFetch(5_000, baseFetch as unknown as typeof fetch);
    const pending = timed("https://example.test/graphql", {
      signal: controller.signal,
    });
    controller.abort();
    await expect(pending).rejects.toMatchObject({ name: "AbortError" });
  });
});
