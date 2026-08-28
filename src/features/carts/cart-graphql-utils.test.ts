import {
  readGraphqlAffectedCount,
  readRemoveCartAffectedCount,
  readUpdateCartAffectedCount,
} from "./cart-graphql-utils";

describe("cart-graphql-utils", () => {
  it("reads positive affected counts", () => {
    expect(readGraphqlAffectedCount({ affectedCount: 2 })).toBe(2);
    expect(
      readRemoveCartAffectedCount({
        deleteFromcartsCollection: { affectedCount: 1 },
      }),
    ).toBe(1);
    expect(
      readUpdateCartAffectedCount({
        updatecartsCollection: { affectedCount: 1 },
      }),
    ).toBe(1);
  });

  it("treats missing or zero affected counts as failure", () => {
    expect(readGraphqlAffectedCount(null)).toBe(0);
    expect(readGraphqlAffectedCount({ affectedCount: 0 })).toBe(0);
    expect(readRemoveCartAffectedCount({})).toBe(0);
  });

  it("models refresh resurrection when delete reports success but affectedCount is 0", () => {
    const affected = readRemoveCartAffectedCount({
      deleteFromcartsCollection: { affectedCount: 0 },
    });
    expect(affected).toBe(0);

    const dbAfterRefresh = [{ product_id: "prod-a", quantity: 1 }];
    expect(dbAfterRefresh).toHaveLength(1);
  });
});
