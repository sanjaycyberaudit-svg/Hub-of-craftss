import {
  buildVeloOrderPushPayload,
  DEFAULT_VELO_ORDER_PUSH_URL,
} from "./velo-order-push-payload";

describe("velo order push payload", () => {
  it("uses the documented default Velo push URL", () => {
    expect(DEFAULT_VELO_ORDER_PUSH_URL).toBe(
      "https://rzwbpjjayarptlwjfpzm.supabase.co/functions/v1/notify-velo-order-push",
    );
  });

  it("builds payload with summed quantity and trimmed shop URL", () => {
    expect(
      buildVeloOrderPushPayload({
        shopBaseUrl: "https://www.sairaghavendratex.com/",
        orderId: "ord_123",
        customerName: " Priya ",
        lineQuantities: [1, 2],
      }),
    ).toEqual({
      shopBaseUrl: "https://www.sairaghavendratex.com",
      orderId: "ord_123",
      customerName: "Priya",
      quantity: 3,
    });
  });

  it("defaults customer name and minimum quantity", () => {
    expect(
      buildVeloOrderPushPayload({
        shopBaseUrl: "https://www.sairaghavendratex.com",
        orderId: "ord_456",
        customerName: "",
        lineQuantities: [],
      }),
    ).toEqual({
      shopBaseUrl: "https://www.sairaghavendratex.com",
      orderId: "ord_456",
      customerName: "Guest",
      quantity: 1,
    });
  });
});
