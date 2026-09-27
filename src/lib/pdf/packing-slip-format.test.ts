import { siteConfig } from "@/config/site";
import {
  PACKING_SLIP_BRAND,
  PACKING_SLIP_THANKS,
  buildPackingSlipPricing,
  formatPackingSlipMoney,
  formatPackingSlipDate,
  formatPackingSlipOrderHeading,
  formatPackingSlipInternalRef,
  formatPackingSlipQuantity,
  buildPackingSlipFromLines,
  buildPackingSlipRecipientLines,
  buildPackingSlipShopFooter,
  resolvePackingSlipShopAddressLines,
} from "./packing-slip-format";

describe("packing slip format (Hub of craftss)", () => {
  it("prints quantity as 1 of 1", () => {
    expect(formatPackingSlipQuantity(1)).toBe("1 of 1");
    expect(formatPackingSlipQuantity(3)).toBe("3 of 3");
  });

  it("prints Order # heading", () => {
    expect(formatPackingSlipOrderHeading("INV-0501201")).toBe(
      "Order #INV-0501201",
    );
  });

  it("prints Ref # for internal invoice-style numbers", () => {
    expect(formatPackingSlipInternalRef("26090001")).toBe("Ref #HOC26090001");
    expect(formatPackingSlipInternalRef(null)).toBeNull();
  });

  it("prints date like 16 August 2026 in IST", () => {
    expect(formatPackingSlipDate("2026-08-16T06:00:00.000Z")).toBe(
      "16 August 2026",
    );
  });

  it("puts name, street, pincode city state, country, and phone on SHIP TO", () => {
    const lines = buildPackingSlipRecipientLines({
      customerName: "Anshula Tayal",
      customerMobile: "9654445244",
      includePhone: true,
      shippingAddress: {
        line1: "C-410 Sfs Flats Triveni Apartment",
        line2: "Sheikh Sarai phase 1",
        city: "New Delhi",
        state: "Delhi",
        postalCode: "110017",
        country: "India",
      },
    });
    expect(lines).toEqual([
      "Anshula Tayal",
      "C-410 Sfs Flats Triveni Apartment",
      "Sheikh Sarai phase 1",
      "110017 New Delhi DL",
      "India",
      "9654445244",
    ]);
  });

  it("prints Hub shop address under FROM (not the customer)", () => {
    const lines = buildPackingSlipFromLines(null, { includePhone: true });
    expect(lines[0]).toBe(siteConfig.name);
    expect(lines).toContain("No 162, Kasim Residency");
    expect(lines).toContain("Sarojini Nagar");
    expect(lines).toContain("Madurai – 625107, Tamil Nadu");
    expect(lines).toContain("India");
    expect(lines).toContain(siteConfig.phone);
    expect(lines).not.toContain("Anshula Tayal");
  });

  it("uses admin shop-contact lines for FROM when provided", () => {
    const lines = buildPackingSlipFromLines(
      [
        "No 162, Kasim Residency",
        "Sarojini Nagar",
        "Madurai – 625107, Tamil Nadu",
        "India",
      ],
      { includePhone: false },
    );
    expect(lines).toEqual([
      siteConfig.name,
      "No 162, Kasim Residency",
      "Sarojini Nagar",
      "Madurai – 625107, Tamil Nadu",
      "India",
    ]);
  });

  it("prints shop footer from Hub site defaults with proprietor phone", () => {
    const footer = buildPackingSlipShopFooter();
    expect(footer.brand).toBe(PACKING_SLIP_BRAND);
    expect(footer.brand).toBe(siteConfig.name);
    expect(PACKING_SLIP_THANKS).toBe("Thank you for shopping with us!");
    expect(footer.address).toContain("Kasim Residency");
    expect(footer.address).toContain("Madurai");
    expect(footer.address).toMatch(/India$/);
    expect(footer.mobile).toBe(`Mobile: ${siteConfig.phone}`);
  });

  it("prints the admin shop-contact address on the packing slip footer", () => {
    const lines = resolvePackingSlipShopAddressLines({
      isEnabled: true,
      value: {
        addressLines: [
          "No 162, Kasim Residency",
          "Sarojini Nagar",
          "Madurai – 625107, Tamil Nadu",
          "India",
        ],
      },
    });
    const footer = buildPackingSlipShopFooter(lines);
    expect(footer.address).toBe(
      "No 162, Kasim Residency, Sarojini Nagar, Madurai – 625107, Tamil Nadu, India",
    );
  });

  it("formats money with Rs. (no rupee glyph for PDF fonts)", () => {
    expect(formatPackingSlipMoney(1234)).toBe("Rs. 1,234");
    expect(formatPackingSlipMoney(529.82)).toBe("Rs. 530");
  });

  it("prints taxable unit prices and a separate GST row for filing", () => {
    const pricing = buildPackingSlipPricing({
      orderAmount: 624,
      paymentMeta: {
        subtotalAmount: 449,
        courierCharge: 80,
        courierRule: "qty1_base",
        gstAmount: 95,
        gstEnabled: true,
        gstPercentage: 18,
      },
      lines: [{ unitPrice: 449, quantity: 1 }],
    });

    expect(pricing.unitPrices).toEqual([449]);
    expect(pricing.summary.map((row) => [row.label, row.value])).toEqual([
      ["Subtotal (excl. GST)", "Rs. 449"],
      ["Courier", "Rs. 80"],
      ["GST (18%)", "Rs. 95"],
      ["Total", "Rs. 624"],
    ]);
    expect(pricing.summary.at(-1)?.emphasize).toBe(true);
  });

  it("keeps plain prices and shows Free courier when GST was off", () => {
    const pricing = buildPackingSlipPricing({
      orderAmount: 700,
      paymentMeta: {
        subtotalAmount: 700,
        courierCharge: 0,
        courierRule: "free_shipping",
        gstEnabled: false,
      },
      lines: [
        { unitPrice: 250, quantity: 2 },
        { unitPrice: 200, quantity: 1 },
      ],
    });

    expect(pricing.unitPrices).toEqual([250, 200]);
    expect(pricing.summary.map((row) => [row.label, row.value])).toEqual([
      ["Subtotal (excl. GST)", "Rs. 700"],
      ["Courier", "Free"],
      ["Total", "Rs. 700"],
    ]);
  });

  it("falls back to the code address when admin shop contact is off", () => {
    const lines = resolvePackingSlipShopAddressLines({
      isEnabled: false,
      value: { addressLines: ["Should not print"] },
    });
    expect(buildPackingSlipShopFooter(lines).address).toContain(
      "Kasim Residency",
    );
  });
});
