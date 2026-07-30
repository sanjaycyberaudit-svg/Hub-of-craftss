import {
  DEFAULT_PRODUCT_OPTION_NAME,
  normalizeProductSizeConfig,
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
        { value: "XL", qty: 1 },
        { size: " xl ", qty: 4 },
      ],
    });

    expect(config.options).toHaveLength(1);
    expect(config.options[0].qty).toBe(4);
  });
});

describe("serializeProductSizeConfig", () => {
  it("writes name and value without the legacy size key", () => {
    const serialized = serializeProductSizeConfig({
      enabled: true,
      name: "Magnet",
      options: [{ value: "WITH MAGNET", size: "WITH MAGNET", qty: 5 }],
    });

    expect(serialized).toEqual({
      enabled: true,
      name: "Magnet",
      options: [{ value: "WITH MAGNET", qty: 5 }],
    });
  });
});
