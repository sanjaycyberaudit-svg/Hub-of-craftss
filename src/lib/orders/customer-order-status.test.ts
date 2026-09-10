import { resolveCustomerOrderHeadline } from "./customer-order-status";

describe("resolveCustomerOrderHeadline", () => {
  it("shows Order Confirmed only when payment is paid", () => {
    for (const status of ["paid", "success", "captured", "PAID"]) {
      const headline = resolveCustomerOrderHeadline(status);
      expect(headline.title).toBe("Order Confirmed");
      expect(headline.tone).toBe("paid");
      expect(headline.clearGuestCart).toBe(true);
      expect(headline.showFulfillmentSteps).toBe(true);
    }
  });

  it("does not look confirmed when unpaid or pending", () => {
    for (const status of ["unpaid", "pending", null, undefined, ""]) {
      const headline = resolveCustomerOrderHeadline(status);
      expect(headline.title).toBe("Awaiting payment");
      expect(headline.tone).toBe("pending");
      expect(headline.clearGuestCart).toBe(false);
      expect(headline.showFulfillmentSteps).toBe(false);
      expect(headline.title).not.toMatch(/confirmed/i);
    }
  });

  it("uses failed copy when payment failed", () => {
    const headline = resolveCustomerOrderHeadline("failed");
    expect(headline.title).toBe("Payment not completed");
    expect(headline.tone).toBe("failed");
    expect(headline.clearGuestCart).toBe(false);
    expect(headline.showFulfillmentSteps).toBe(false);
  });
});
