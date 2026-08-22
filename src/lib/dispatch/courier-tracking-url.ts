const TRACKING_TOKEN = "{tracking}";

export function buildCourierTrackingUrl(
  template: string | null | undefined,
  trackingNumber: string | null | undefined,
): string | null {
  const normalizedTemplate = template?.trim();
  if (!normalizedTemplate) return null;
  const tracking = trackingNumber?.trim();
  if (!tracking) return null;
  const encoded = encodeURIComponent(tracking);
  const urlStr = normalizedTemplate.includes(TRACKING_TOKEN)
    ? normalizedTemplate.split(TRACKING_TOKEN).join(encoded)
    : `${normalizedTemplate.replace(/\/+$/, "")}/${encoded}`;
  try {
    const url = new URL(urlStr);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function resolveCourierTrackingUrl(input: {
  trackingNumber: string | null | undefined;
  templateSnapshot?: string | null;
  templateFallback?: string | null;
}): string | null {
  return (
    buildCourierTrackingUrl(input.templateSnapshot, input.trackingNumber) ??
    buildCourierTrackingUrl(input.templateFallback, input.trackingNumber)
  );
}
