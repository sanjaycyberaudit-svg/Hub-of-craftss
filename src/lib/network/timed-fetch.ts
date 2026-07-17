/** Bound GraphQL fetches so Workers Free CPU is not burned after UI timeouts. */
export const GRAPHQL_TIMEOUT_MS = 4_000;

type FetchFn = typeof fetch;

/**
 * Combines the caller's AbortSignal (URQL cancel) with a hard timeout.
 * Always clears the timer and removes listeners so nothing leaks after abort.
 */
export function createTimedFetch(
  timeoutMs: number = GRAPHQL_TIMEOUT_MS,
  baseFetch: FetchFn = globalThis.fetch.bind(globalThis),
): FetchFn {
  return async (input, init) => {
    const requestInit: RequestInit = init ?? {};
    const controller = new AbortController();
    const external = requestInit.signal;
    const onExternalAbort = () => {
      try {
        controller.abort(external?.reason);
      } catch {
        controller.abort();
      }
    };

    if (external) {
      if (external.aborted) {
        onExternalAbort();
      } else {
        external.addEventListener("abort", onExternalAbort, { once: true });
      }
    }

    const timer = setTimeout(() => {
      try {
        controller.abort(new Error(`GraphQL timed out after ${timeoutMs}ms`));
      } catch {
        controller.abort();
      }
    }, timeoutMs);

    try {
      return await baseFetch(input, {
        ...requestInit,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
      external?.removeEventListener("abort", onExternalAbort);
    }
  };
}
