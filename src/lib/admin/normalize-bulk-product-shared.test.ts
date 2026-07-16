import {
  buildBulkSharedPayloadFromForm,
  normalizeBulkDraftShared,
  parseBulkSharedInput,
} from "./normalize-bulk-product-shared";

describe("normalizeBulkDraftShared", () => {
  it("keeps discount disabled by default", () => {
    const shared = normalizeBulkDraftShared({
      name: "Silk Saree",
      description: "",
      isDraft: true,
      collectionId: "col-1",
      badge: null,
      rating: "4",
      price: "1299",
      stock: 2,
      discountEnabled: false,
      discountPercent: null,
    });

    expect(shared.discountEnabled).toBe(false);
    expect(shared.discountPercent).toBeNull();
  });

  it("stores normalized discount when enabled", () => {
    const shared = normalizeBulkDraftShared({
      name: "Silk Saree",
      description: "",
      isDraft: false,
      collectionId: "col-1",
      badge: "best_sale",
      rating: "4",
      price: "2000",
      stock: 5,
      discountEnabled: true,
      discountPercent: 25,
    });

    expect(shared.discountEnabled).toBe(true);
    expect(shared.discountPercent).toBe(25);
  });

  it("rejects enabled discount without a valid percent", () => {
    expect(() =>
      normalizeBulkDraftShared({
        name: "Silk Saree",
        description: "",
        isDraft: true,
        collectionId: "col-1",
        badge: null,
        rating: "4",
        price: "1000",
        stock: 1,
        discountEnabled: true,
        discountPercent: 0,
      }),
    ).toThrow(/between 1 and 99/i);
  });
});

describe("parseBulkSharedInput", () => {
  it("parses JSON-like payloads with string numbers", () => {
    const shared = parseBulkSharedInput({
      name: "Wedding Saree",
      description: "Test",
      isDraft: "false",
      collectionId: "col-1",
      badge: null,
      rating: "4",
      price: "1500",
      stock: "3",
      discountEnabled: "true",
      discountPercent: "15",
    });

    expect(shared.baseName).toBe("Wedding Saree");
    expect(shared.stock).toBe(3);
    expect(shared.discountEnabled).toBe(true);
    expect(shared.discountPercent).toBe(15);
  });
});

describe("buildBulkSharedPayloadFromForm", () => {
  it("maps form values into normalized bulk shared data", () => {
    const shared = buildBulkSharedPayloadFromForm({
      name: " Cotton ",
      description: "Soft cotton",
      isDraft: true,
      collectionId: "col-1",
      badge: "new_product",
      rating: "4.5",
      price: "999",
      stock: 4,
      discountEnabled: true,
      discountPercent: 10,
    });

    expect(shared.baseName).toBe("Cotton");
    expect(shared.collectionId).toBe("col-1");
    expect(shared.badge).toBe("new_product");
    expect(shared.discountPercent).toBe(10);
  });
});
