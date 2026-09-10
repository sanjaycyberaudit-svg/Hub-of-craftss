import {
  isPaidPaymentStatus,
  normalizeOrderStatus,
} from "@/lib/orders/paymentStatus";

export type CustomerOrderHeadlineTone = "paid" | "pending" | "failed";

export type CustomerOrderHeadline = {
  title: string;
  description: string;
  tone: CustomerOrderHeadlineTone;
  /** Clear guest cart / treat as completed checkout only when true. */
  clearGuestCart: boolean;
  /** Show fulfillment progress (ordered → delivered) only after payment. */
  showFulfillmentSteps: boolean;
};

/**
 * Customer-facing order page copy. Unpaid / failed returns must never look
 * like a successful confirmation (even though the order row already exists).
 */
export function resolveCustomerOrderHeadline(
  paymentStatus: string | null | undefined,
): CustomerOrderHeadline {
  if (isPaidPaymentStatus(paymentStatus)) {
    return {
      title: "Order Confirmed",
      description: "Payment received. We will pack and ship your order soon.",
      tone: "paid",
      clearGuestCart: true,
      showFulfillmentSteps: true,
    };
  }

  const normalized = normalizeOrderStatus(paymentStatus);
  if (normalized === "failed" || normalized === "cancelled") {
    return {
      title: "Payment not completed",
      description:
        "This order is not confirmed. No payment was captured — your cart is still available if you want to try again.",
      tone: "failed",
      clearGuestCart: false,
      showFulfillmentSteps: false,
    };
  }

  return {
    title: "Awaiting payment",
    description:
      "Your order draft is saved, but it is not confirmed until payment succeeds. If you closed the payment window, you can return to the cart and try again.",
    tone: "pending",
    clearGuestCart: false,
    showFulfillmentSteps: false,
  };
}
