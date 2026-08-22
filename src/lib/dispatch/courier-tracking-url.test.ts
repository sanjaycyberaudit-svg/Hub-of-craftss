import {
  buildCourierTrackingUrl,
  resolveCourierTrackingUrl,
} from "./courier-tracking-url";

describe("courier tracking URLs", () => {
  it("replaces a tracking token", () => {
    expect(
      buildCourierTrackingUrl("https://track.test/{tracking}", "AB-123"),
    ).toBe("https://track.test/AB-123");
  });
  it("appends tracking without a token", () => {
    expect(buildCourierTrackingUrl("https://track.test", "123")).toBe(
      "https://track.test/123",
    );
  });
  it("rejects missing tracking and invalid URLs", () => {
    expect(
      buildCourierTrackingUrl("https://track.test/{tracking}", ""),
    ).toBeNull();
    expect(buildCourierTrackingUrl("bad/{tracking}", "123")).toBeNull();
  });
  it("prefers a stored snapshot", () => {
    expect(
      resolveCourierTrackingUrl({
        trackingNumber: "123",
        templateSnapshot: "https://snap.test/{tracking}",
        templateFallback: "https://live.test/{tracking}",
      }),
    ).toBe("https://snap.test/123");
  });
});
