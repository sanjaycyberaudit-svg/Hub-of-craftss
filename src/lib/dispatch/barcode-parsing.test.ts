import { parseTrackingNumberFromBarcodeText } from "./barcode-parsing";

describe("parseTrackingNumberFromBarcodeText", () => {
  it("sanitizes clean input", () => {
    expect(parseTrackingNumberFromBarcodeText("ab_987")).toBe("AB_987");
  });
  it("extracts a digit-containing token", () => {
    expect(parseTrackingNumberFromBarcodeText("Tracking: ab-12345")).toBe(
      "AB-12345",
    );
  });
  it("removes spaces and rejects text-only values", () => {
    expect(parseTrackingNumberFromBarcodeText("ab 123 45")).toBe("AB12345");
    expect(parseTrackingNumberFromBarcodeText("NOTHING HERE")).toBeNull();
  });
});
