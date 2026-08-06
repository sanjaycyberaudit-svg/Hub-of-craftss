import { classifyProductDeleteTargets } from "@/lib/admin/product-lifecycle-classify";

describe("classifyProductDeleteTargets", () => {
  it("treats missing ids as already gone (idempotent DELETE)", () => {
    const result = classifyProductDeleteTargets(
      ["alive", "ghost", "alive"],
      new Set(["alive"]),
      new Set(),
    );
    expect(result).toEqual({
      toDelete: ["alive"],
      toArchive: [],
      alreadyGoneIds: ["ghost"],
    });
  });

  it("archives products with paid order history", () => {
    const result = classifyProductDeleteTargets(
      ["paid", "free"],
      new Set(["paid", "free"]),
      new Set(["paid"]),
    );
    expect(result).toEqual({
      toDelete: ["free"],
      toArchive: ["paid"],
      alreadyGoneIds: [],
    });
  });

  it("returns empty buckets for empty input", () => {
    expect(classifyProductDeleteTargets([], new Set(), new Set())).toEqual({
      toDelete: [],
      toArchive: [],
      alreadyGoneIds: [],
    });
  });
});
