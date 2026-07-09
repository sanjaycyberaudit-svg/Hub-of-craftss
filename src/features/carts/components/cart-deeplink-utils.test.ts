import {
  linesFingerprint,
  mergeDeepLinkLines,
  parseCartItemsParam,
  parseDeepLinkLines,
} from "./cart-deeplink-utils";

describe("parseCartItemsParam", () => {
  it("parses single item", () => {
    expect(parseCartItemsParam("abc-123:2")).toEqual([
      { productId: "abc-123", quantity: 2 },
    ]);
  });

  it("parses multiple items", () => {
    expect(parseCartItemsParam("id1:1,id2:3")).toEqual([
      { productId: "id1", quantity: 1 },
      { productId: "id2", quantity: 3 },
    ]);
  });

  it("uses last colon for product ids that contain colons", () => {
    expect(parseCartItemsParam("a:b:c:2")).toEqual([
      { productId: "a:b:c", quantity: 2 },
    ]);
  });

  it("merges duplicate product ids", () => {
    expect(parseCartItemsParam("id1:1,id1:2")).toEqual([
      { productId: "id1", quantity: 3 },
    ]);
  });
});

describe("parseDeepLinkLines", () => {
  it("prefers items param over add", () => {
    const params = new URLSearchParams("items=id1:1&add=id2&quantity=5");
    expect(parseDeepLinkLines(params)).toEqual([
      { productId: "id1", quantity: 1 },
    ]);
  });

  it("falls back to add param", () => {
    const params = new URLSearchParams("add=prod-99&quantity=2");
    expect(parseDeepLinkLines(params)).toEqual([
      { productId: "prod-99", quantity: 2 },
    ]);
  });
});

describe("linesFingerprint", () => {
  it("is stable regardless of line order", () => {
    const a = linesFingerprint([
      { productId: "b", quantity: 1 },
      { productId: "a", quantity: 2 },
    ]);
    const b = linesFingerprint([
      { productId: "a", quantity: 2 },
      { productId: "b", quantity: 1 },
    ]);
    expect(a).toBe(b);
  });
});

describe("mergeDeepLinkLines", () => {
  it("caps quantity at 99", () => {
    expect(
      mergeDeepLinkLines([
        { productId: "x", quantity: 80 },
        { productId: "x", quantity: 30 },
      ]),
    ).toEqual([{ productId: "x", quantity: 99 }]);
  });
});
