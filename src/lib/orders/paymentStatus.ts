export type OrderPaymentSnapshot = {
  payment_status: string | null | undefined;
  order_status?: string | null | undefined;
};

export function normalizeOrderStatus(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

export function isPaidPaymentStatus(
  paymentStatus: string | null | undefined,
): boolean {
  const normalized = normalizeOrderStatus(paymentStatus);
  return (
    normalized === "paid" ||
    normalized === "success" ||
    normalized === "captured"
  );
}

export function needsPaymentAttention(order: OrderPaymentSnapshot): boolean {
  const paymentStatus = normalizeOrderStatus(order.payment_status);
  const orderStatus = normalizeOrderStatus(order.order_status);

  if (orderStatus === "cancelled") return false;
  if (orderStatus === "pending") return true;

  return (
    paymentStatus === "unpaid" ||
    paymentStatus === "pending" ||
    paymentStatus === "failed"
  );
}
