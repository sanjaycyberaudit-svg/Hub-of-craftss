import {
  courierNameToIdBase,
  normalizeCourierName,
  parseCreateDispatchCourierPayload,
  validateTrackingUrlTemplate,
} from "./courier-form";

describe("courier form", () => {
  it("normalizes names", () => {
    expect(normalizeCourierName("  Ekart   Logistics  ")).toBe(
      "Ekart Logistics",
    );
    expect(courierNameToIdBase("Ekart Logistics")).toBe("ekartlogistics");
  });
  it("validates tracking templates", () => {
    expect(validateTrackingUrlTemplate("")).toBeNull();
    expect(validateTrackingUrlTemplate("https://track.test/{tracking}")).toBe(
      "https://track.test/{tracking}",
    );
    expect(() => validateTrackingUrlTemplate("bad")).toThrow(/valid http/i);
  });
  it("parses valid and invalid payloads", () => {
    expect(parseCreateDispatchCourierPayload({ name: "Ekart" }).success).toBe(
      true,
    );
    expect(parseCreateDispatchCourierPayload({ name: "A" }).success).toBe(
      false,
    );
  });
});
