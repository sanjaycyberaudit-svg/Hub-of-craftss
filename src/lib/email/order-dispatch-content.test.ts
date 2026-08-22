import {
  buildOrderDispatchHtml,
  buildOrderDispatchPlainText,
  buildOrderDispatchSubject,
  type OrderDispatchEmailInput,
} from "./order-dispatch-content";

describe("order dispatch email content", () => {
  const input: OrderDispatchEmailInput = {
    orderId: "ord_dispatch1",
    customerName: "Sanjay",
    customerEmail: "buyer@example.com",
    createdAt: "2026-01-15T10:30:00.000Z",
    customerPhone: "+91 9876543210",
    lineItems: [
      {
        name: "Mandala Kit",
        quantity: 2,
        unitPrice: 500,
        imageUrl: "https://hubsofcraftss.com/images/mandala.jpg",
        imageAlt: "Mandala Kit",
        productCode: "MK-001",
      },
    ],
    shippingAddress: {
      line1: "12 MG Road",
      line2: null,
      city: "Madurai",
      state: "Tamil Nadu",
      postalCode: "625107",
      country: "India",
    },
    orderUrl: "https://hubsofcraftss.com/orders/ord_dispatch1?token=abc",
    courierName: "Delhivery",
    trackingNumber: "DL123456789",
    trackingUrl: "https://track.example.com/DL123456789",
    dispatchedAt: "2026-01-16T08:00:00.000Z",
  };

  it("uses Hub branding in the subject", () => {
    expect(buildOrderDispatchSubject(input.orderId)).toBe(
      "Your order has shipped — #ord_dispatch1 · Hub of craftss",
    );
  });
  it("includes dispatch details in text and html", () => {
    const text = buildOrderDispatchPlainText(input);
    const html = buildOrderDispatchHtml(input);
    expect(text).toContain("Hub of craftss order #ord_dispatch1");
    expect(text).toContain("Tracking number: DL123456789");
    expect(html).toContain("Hub of craftss");
    expect(html).toContain("Track package");
  });
});
