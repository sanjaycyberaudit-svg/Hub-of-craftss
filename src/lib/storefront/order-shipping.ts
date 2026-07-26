/** Shared order / shipping copy — keep wording short and plain for all buyers. */

export const ORDER_SHIPPING = {
  title: "Order & shipping",
  processingLabel: "Getting your order ready",
  processing: "4–5 working days",
  processingNote: "May take longer for large orders.",
  deliveryLabel: "Delivery time",
  regions: [
    { place: "Tamil Nadu", time: "2–3 working days" },
    { place: "Other states (India)", time: "5–6 working days" },
    { place: "Outside India", time: "15–20 working days" },
  ] as const,
  readyStock:
    "Items already in stock ship sooner after we confirm your order.",
  tracking:
    "After we ship, you get an email with tracking details.",
  noEmail:
    "No email in 10–15 working days? Message us on WhatsApp or email.",
  wholesale: "Wholesale orders may take longer.",
  fullDetailsHref: "/shipping-returns",
  fullDetailsLabel: "Full shipping details",
} as const;
