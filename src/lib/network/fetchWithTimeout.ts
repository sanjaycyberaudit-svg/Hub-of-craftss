const DEFAULT_TIMEOUT_MS = 12000;
const DEFAULT_ADMIN_READ_TIMEOUT_MS = 30000;

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit & { timeoutMs?: number } = {},
) {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, signal, ...rest } = init;
  const controller = new AbortController();
  const externalAbort = () => controller.abort();
  signal?.addEventListener("abort", externalAbort, { once: true });
  const timeout = setTimeout(() => {
    controller.abort(new Error(`Request timed out after ${timeoutMs}ms`));
  }, timeoutMs);

  try {
    return await fetch(input, { ...rest, signal: controller.signal });
  } finally {
    signal?.removeEventListener("abort", externalAbort);
    clearTimeout(timeout);
  }
}

/** Retry transient failures (timeout / 5xx) for admin reads. */
export async function fetchWithRetry(
  input: RequestInfo | URL,
  init: RequestInit & {
    timeoutMs?: number;
    retries?: number;
    retryDelayMs?: number;
  } = {},
) {
  const {
    retries = 2,
    retryDelayMs = 600,
    timeoutMs = DEFAULT_ADMIN_READ_TIMEOUT_MS,
    ...rest
  } = init;

  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response = await fetchWithTimeout(input, { ...rest, timeoutMs });
      if (response.status < 500) return response;
      lastError = new Error(`Server error (${response.status}).`);
    } catch (error) {
      lastError = error;
    }

    if (attempt < retries) {
      await delay(retryDelayMs * (attempt + 1));
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Request failed after retries.");
}
