import {
  areCartSelectionsComplete,
  findIncompleteCheckoutProductIds,
  resolveCheckoutSizeConfigs,
  type CartSizeConfigPayload,
} from "./cart-options-checkout";

const colourSizeConfig: CartSizeConfigPayload = {
  enabled: true,
  name: "Options",
  groups: [
    {
      id: "color",
      name: "Color",
      options: [
        { value: "RED", size: "RED", qty: 10, price: null },
        { value: "BLUE", size: "BLUE", qty: 10, price: null },
      ],
    },
    {
      id: "size",
      name: "Size",
      options: [
        { value: "M", size: "M", qty: 10, price: null },
        { value: "L", size: "L", qty: 10, price: null },
      ],
    },
  ],
  options: [
    { value: "RED", size: "RED", qty: 10, price: null },
    { value: "BLUE", size: "BLUE", qty: 10, price: null },
  ],
};

const noOptionsConfig: CartSizeConfigPayload = {
  enabled: false,
  name: "Size",
  options: [],
  groups: [],
};

describe("cart-options-checkout", () => {
  it("treats complete selections with null/missing legacy size as complete", () => {
    expect(
      areCartSelectionsComplete({
        sizeConfig: colourSizeConfig,
        selections: { color: "RED", size: "M" },
        size: null,
      }),
    ).toBe(true);

    expect(
      findIncompleteCheckoutProductIds({
        order: {
          p1: {
            quantity: 1,
            size: undefined,
            selections: { color: "RED", size: "M" },
          },
        },
        sizeConfigsByProductId: { p1: colourSizeConfig },
      }),
    ).toEqual([]);
  });

  it("flags incomplete checkout lines when options are required but empty", () => {
    expect(
      areCartSelectionsComplete({
        sizeConfig: colourSizeConfig,
        selections: null,
        size: null,
      }),
    ).toBe(false);

    expect(
      findIncompleteCheckoutProductIds({
        order: {
          p1: { quantity: 1, size: undefined, selections: undefined },
        },
        sizeConfigsByProductId: { p1: colourSizeConfig },
      }),
    ).toEqual(["p1"]);
  });

  it("accepts legacy size alone when mapped to the first group", () => {
    expect(
      areCartSelectionsComplete({
        sizeConfig: {
          enabled: true,
          name: "Size",
          groups: [
            {
              id: "size",
              name: "Size",
              options: [
                { value: "M", size: "M", qty: 5, price: null },
                { value: "L", size: "L", qty: 5, price: null },
              ],
            },
          ],
          options: [
            { value: "M", size: "M", qty: 5, price: null },
            { value: "L", size: "L", qty: 5, price: null },
          ],
        },
        selections: null,
        size: "M",
      }),
    ).toBe(true);
  });

  it("treats disabled options as complete for checkout", () => {
    expect(
      areCartSelectionsComplete({
        sizeConfig: noOptionsConfig,
        selections: null,
        size: null,
      }),
    ).toBe(true);

    expect(
      findIncompleteCheckoutProductIds({
        order: {
          p2: { quantity: 1, size: undefined },
        },
        sizeConfigsByProductId: { p2: noOptionsConfig },
      }),
    ).toEqual([]);
  });

  it("batch-resolves only missing checkout size configs", async () => {
    const fetchConfigs = jest.fn(async () => ({
      p2: colourSizeConfig,
    }));
    const merged = await resolveCheckoutSizeConfigs({
      productIds: ["p1", "p2"],
      knownConfigs: { p1: noOptionsConfig },
      fetchConfigs,
    });
    expect(fetchConfigs).toHaveBeenCalledWith(["p2"]);
    expect(merged.p1).toBe(noOptionsConfig);
    expect(merged.p2).toBe(colourSizeConfig);
  });
});
