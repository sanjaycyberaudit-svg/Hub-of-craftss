import {
  DEFAULT_PRODUCT_OPTION_NAME,
  normalizeProductSizeConfig,
  resolveListPriceForSelection,
  serializeProductSizeConfig,
} from "./sizeConfig-shared";

describe("normalizeProductSizeConfig", () => {
  it("defaults the group name to Size when missing", () => {
    const config = normalizeProductSizeConfig({
      enabled: true,
      options: [{ size: "XL", qty: 2 }],
    });

    expect(config.name).toBe(DEFAULT_PRODUCT_OPTION_NAME);
  });

  it("maps legacy size into value and mirrors size alias", () => {
    const config = normalizeProductSizeConfig({
      enabled: true,
      options: [{ size: "with magnet", qty: 3 }],
    });

    expect(config.options[0]).toEqual({
      value: "WITH MAGNET",
      size: "WITH MAGNET",
      qty: 3,
      price: null,
    });
  });

  it("prefers value over size when both exist", () => {
    const config = normalizeProductSizeConfig({
      enabled: true,
      name: "Magnet",
      options: [{ value: "NO MAGNET", size: "OLD", qty: 1 }],
    });

    expect(config.name).toBe("Magnet");
    expect(config.options[0].value).toBe("NO MAGNET");
  });

  it("allows longer option values up to 24 characters", () => {
    const config = normalizeProductSizeConfig({
      enabled: true,
      name: "Finish",
      options: [{ value: "WITH MAGNET EXTRA", qty: 1 }],
    });

    expect(config.options[0].value).toBe("WITH MAGNET EXTRA");
  });

  it("dedupes options by normalized value", () => {
    const config = normalizeProductSizeConfig({
      enabled: true,
      options: [
        { value: "XL", qty: 1, price: 100 },
        { size: " xl ", qty: 4, price: 250 },
      ],
    });

    expect(config.options).toHaveLength(1);
    expect(config.options[0].qty).toBe(4);
    expect(config.options[0].price).toBe(250);
  });

  it("normalizes per-option price and keeps legacy null", () => {
    const config = normalizeProductSizeConfig({
      enabled: true,
      options: [
        { value: "A", qty: 1, price: "199.999" },
        { value: "B", qty: 1 },
      ],
    });

    expect(config.options[0].price).toBe(200);
    expect(config.options[1].price).toBeNull();
  });
});

describe("serializeProductSizeConfig", () => {
  it("writes name, value, and price without the legacy size key", () => {
    const serialized = serializeProductSizeConfig({
      enabled: true,
      name: "Magnet",
      options: [
        { value: "WITH MAGNET", size: "WITH MAGNET", qty: 5, price: 350 },
        { value: "NO MAGNET", size: "NO MAGNET", qty: 2, price: null },
      ],
    });

    expect(serialized).toEqual({
      enabled: true,
      name: "Magnet",
      options: [
        { value: "WITH MAGNET", qty: 5, price: 350 },
        { value: "NO MAGNET", qty: 2 },
      ],
    });
  });
});

describe("resolveListPriceForSelection", () => {
  const config = normalizeProductSizeConfig({
    enabled: true,
    options: [
      { value: "S", qty: 2, price: 400 },
      { value: "L", qty: 1, price: 600 },
    ],
  });

  it("uses the selected option price", () => {
    expect(
      resolveListPriceForSelection({
        baseListPrice: 999,
        sizeConfig: config,
        selectedSize: "L",
      }),
    ).toBe(600);
  });

  it("falls back to product price for legacy options without price", () => {
    const legacy = normalizeProductSizeConfig({
      enabled: true,
      options: [{ value: "XL", qty: 1 }],
    });
    expect(
      resolveListPriceForSelection({
        baseListPrice: 999,
        sizeConfig: legacy,
        selectedSize: "XL",
      }),
    ).toBe(999);
  });

  it("can prefer the cheapest option before selection", () => {
    expect(
      resolveListPriceForSelection({
        baseListPrice: 999,
        sizeConfig: config,
        preferMinWhenUnselected: true,
      }),
    ).toBe(400);
  });
});
