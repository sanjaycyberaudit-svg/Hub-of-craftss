import { graphqlCartToCartItems } from "./cart-storage-sync";

describe("graphqlCartToCartItems", () => {
  it("maps graphql cart edges to cookie cart items", () => {
    const items = graphqlCartToCartItems(
      {
        cartsCollection: {
          edges: [
            {
              node: {
                product_id: "prod-a",
                quantity: 2,
                product: { id: "prod-a", name: "A" },
              },
            },
          ],
        },
      } as never,
      {
        "prod-a": { quantity: 1, size: "M" },
      },
    );

    expect(items["prod-a"]).toEqual({
      quantity: 2,
      size: "M",
    });
  });

  it("drops zero-quantity lines", () => {
    const items = graphqlCartToCartItems({
      cartsCollection: {
        edges: [
          {
            node: {
              product_id: "prod-a",
              quantity: 0,
              product: { id: "prod-a", name: "A" },
            },
          },
        ],
      },
    } as never);

    expect(items).toEqual({});
  });
});
