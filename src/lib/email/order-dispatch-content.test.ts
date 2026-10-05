import { toGstInclusiveAmount } from "@/lib/courier/calculate";
import { formatInr } from "@/lib/utils";
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
    paymentMeta: {
      gstEnabled: true,
      gstPercentage: 18,
    },
  };

  it("uses Hub branding in the subject", () => {
    expect(buildOrderDispatchSubject(input.orderId)).toBe(
      "Your order has shipped — #ord_dispatch1 · Hub of craftss",
    );
  });

  it("uses the HOC internal ref as the order number when assigned", () => {
    expect(buildOrderDispatchSubject("ord_dispatch1", "26100041")).toBe(
      "Your order has shipped — HOC26100041 · Hub of craftss",
    );
    const withRef = { ...input, internalRef: "26100041" };
    const text = buildOrderDispatchPlainText(withRef);
    expect(text).toContain("Order No: HOC26100041");
    expect(text).toContain("Order ID: #ord_dispatch1");
    const html = buildOrderDispatchHtml(withRef);
    expect(html).toContain("Order No: HOC26100041");
    expect(html).toContain("Order ID: #ord_dispatch1");
  });

  it("includes dispatch details in text and html", () => {
    const text = buildOrderDispatchPlainText(input);
    const html = buildOrderDispatchHtml(input);
    const inclusiveUnit = toGstInclusiveAmount(500, {
      gstEnabled: true,
      gstPercentage: 18,
    });
    expect(text).toContain("Your Hub of craftss order has been dispatched.");
    expect(text).toContain("Order #ord_dispatch1");
    expect(text).toContain("Tracking number: DL123456789");
    expect(text).toContain(formatInr(inclusiveUnit * 2));
    expect(html).toContain("Hub of craftss");
    expect(html).toContain("Track package");
  });
});
