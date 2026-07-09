export const DEFAULT_VELO_ORDER_PUSH_URL =
  "https://rzwbpjjayarptlwjfpzm.supabase.co/functions/v1/notify-velo-order-push";

export type VeloOrderPushPayload = {
  shopBaseUrl: string;
  orderId: string;
  customerName: string;
  quantity: number;
};

export function buildVeloOrderPushPayload(input: {
  shopBaseUrl: string;
  orderId: string;
  customerName?: string | null;
  lineQuantities: number[];
}): VeloOrderPushPayload {
  const quantity = Math.max(
    1,
    input.lineQuantities.reduce(
      (sum, qty) => sum + (Number.isFinite(qty) && qty > 0 ? qty : 0),
      0,
    ),
  );

  const customerName = String(input.customerName ?? "").trim() || "Guest";

  return {
    shopBaseUrl: input.shopBaseUrl.replace(/\/$/, ""),
    orderId: input.orderId,
    customerName,
    quantity,
  };
}
