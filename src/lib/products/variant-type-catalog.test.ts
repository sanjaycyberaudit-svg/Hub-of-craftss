import {
  DEFAULT_VARIANT_TYPE_NAMES,
  VARIANT_TYPE_CATALOG_MAX,
  mergeVariantTypeNames,
  parseVariantTypeCatalogValue,
  serializeVariantTypeCatalog,
} from "@/lib/products/variant-type-catalog-shared";

describe("variant type catalog", () => {
  it("parses empty catalog with defaults", () => {
    expect(parseVariantTypeCatalogValue({})).toEqual([
      ...DEFAULT_VARIANT_TYPE_NAMES,
    ]);
    expect(parseVariantTypeCatalogValue(null)).toEqual([
      ...DEFAULT_VARIANT_TYPE_NAMES,
    ]);
  });

  it("de-dupes case-insensitively and keeps first casing", () => {
    expect(
      mergeVariantTypeNames(DEFAULT_VARIANT_TYPE_NAMES, [
        "magnet",
        "MAGNET",
        "Pack",
      ]),
    ).toEqual(["Size", "Magnet", "Colour", "Pack"]);
  });

  it("caps catalog size", () => {
    const extras = Array.from({ length: 60 }, (_, i) => `Type${i}`);
    const merged = mergeVariantTypeNames(DEFAULT_VARIANT_TYPE_NAMES, extras);
    expect(merged).toHaveLength(VARIANT_TYPE_CATALOG_MAX);
    expect(merged.slice(0, 3)).toEqual([...DEFAULT_VARIANT_TYPE_NAMES]);
  });

  it("serializes with defaults merged", () => {
    expect(serializeVariantTypeCatalog(["Magnet", "Pack"])).toEqual({
      names: ["Size", "Magnet", "Colour", "Pack"],
    });
  });

  it("parses stored catalog value", () => {
    expect(
      parseVariantTypeCatalogValue({ names: ["Pack", "size", "Magnet"] }),
    ).toEqual(["Size", "Magnet", "Colour", "Pack"]);
  });
});
