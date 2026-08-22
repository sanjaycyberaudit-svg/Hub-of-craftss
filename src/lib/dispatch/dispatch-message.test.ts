import { buildDispatchNotificationText } from "./dispatch-message";

describe("buildDispatchNotificationText", () => {
  it("includes courier and tracking details", () => {
    const text = buildDispatchNotificationText({
      orderId: "ord_1",
      customerName: "Priya",
      courierName: "Delhivery",
      trackingNumber: "AB123",
      dispatchedAt: "2026-08-19T10:00:00.000Z",
      trackingUrlTemplate: "https://track.test/{tracking}",
    });
    expect(text).toContain("Courier: Delhivery");
    expect(text).toContain("Tracking number: AB123");
    expect(text).toContain("https://track.test/AB123");
  });
  it("omits tracking when unavailable", () => {
    const text = buildDispatchNotificationText({
      orderId: "ord_2",
      courierName: "Local courier",
      dispatchedAt: "2026-08-19T10:00:00.000Z",
    });
    expect(text).not.toContain("Track here:");
  });
});
