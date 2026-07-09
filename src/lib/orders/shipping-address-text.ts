export type ShippingAddressFields = {
  line1: string | null;
  line2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
};

export function buildShippingAddressLines(
  shippingAddress: ShippingAddressFields | null,
): string[] {
  if (!shippingAddress) return ["Address not available"];

  const lines: string[] = [];
  const line1 = shippingAddress.line1?.trim();
  const line2 = shippingAddress.line2?.trim();

  if (line1) lines.push(line1);
  if (line2) lines.push(line2);

  const cityState = [
    shippingAddress.city?.trim(),
    shippingAddress.state?.trim(),
  ]
    .filter(Boolean)
    .join(", ");

  if (cityState) lines.push(cityState);

  const country = shippingAddress.country?.trim();
  if (country && country.toLowerCase() !== "india") {
    lines.push(country);
  }

  return lines.length > 0 ? lines : ["Address not available"];
}

/** Clipboard-ready block: name, address, pincode, mobile — no labels. */
export function buildShippingAddressCopyText(payload: {
  customerName: string | null;
  customerMobile: string | null;
  shippingAddress: ShippingAddressFields | null;
}): string {
  const name = payload.customerName?.trim() || "Customer";
  const addressBlock = buildShippingAddressLines(payload.shippingAddress).join(
    "\n",
  );
  const pincode = payload.shippingAddress?.postalCode?.trim() || "-";
  const mobile = payload.customerMobile?.trim() || "-";

  return [name, addressBlock, pincode, mobile].join("\n").trim();
}
