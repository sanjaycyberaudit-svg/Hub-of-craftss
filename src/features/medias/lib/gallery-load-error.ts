/** Never surface raw browser abort strings in the admin media picker. */

export function isAbortLikeError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { name?: unknown; message?: unknown };
  const name = typeof candidate.name === "string" ? candidate.name : "";
  const message =
    typeof candidate.message === "string" ? candidate.message : "";
  return (
    name === "AbortError" ||
    /aborted|timed out|timeout/i.test(message) ||
    /fetch is aborted/i.test(message)
  );
}

export function galleryLoadErrorMessage(error: unknown): string {
  if (isAbortLikeError(error)) {
    return "Could not load images. Try again.";
  }
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  return "Could not load images. Try again.";
}
