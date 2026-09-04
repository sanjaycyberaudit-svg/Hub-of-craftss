import { siteConfig } from "@/config/site";
import type { AdminOrderListView } from "@/lib/admin/getAdminOrdersList";
import type { PackingSlipOrder } from "@/lib/pdf/packing-slip-format";
import type { PdfLabelOrder } from "@/lib/pdf/shipping-label-pdf";

/** Shop FROM block for parcel labels (matches Software-Saree-order sender_details). */
export function buildAdminPdfSenderDetails(): string {
  const lines = [
    siteConfig.name,
    ...siteConfig.addressLines,
    siteConfig.phone ? `Ph: ${siteConfig.phone}` : null,
    siteConfig.gstin ? `GSTIN: ${siteConfig.gstin}` : null,
  ].filter((line): line is string => Boolean(line && line.trim()));

  return lines.join("\n");
}

export function adminOrderToPdfLabel(
  order: Pick<AdminOrderListView, "id" | "copyAddressText" | "internalRef">,
  senderDetails = buildAdminPdfSenderDetails(),
): PdfLabelOrder {
  return {
    id: order.id,
    internalRef: order.internalRef ?? null,
    sender_details: senderDetails,
    recipient_details: order.copyAddressText || "Address not available",
  };
}

export function adminOrdersToPdfLabels(
  orders: Pick<
    AdminOrderListView,
    "id" | "copyAddressText" | "internalRef"
  >[],
): PdfLabelOrder[] {
  const sender = buildAdminPdfSenderDetails();
  return orders.map((order) => adminOrderToPdfLabel(order, sender));
}

export function adminOrderToPackingSlip(
  order: Pick<
    AdminOrderListView,
    | "id"
    | "internalRef"
    | "createdAt"
    | "customerName"
    | "customerMobile"
    | "shippingAddress"
    | "lines"
  >,
): PackingSlipOrder {
  return {
    id: order.id,
    internalRef: order.internalRef ?? null,
    createdAt: order.createdAt,
    customerName: order.customerName,
    customerMobile: order.customerMobile,
    shippingAddress: order.shippingAddress,
    items: (order.lines ?? []).map((line) => ({
      name: line.productName,
      quantity: line.quantity,
      imageUrl: line.imageUrl,
    })),
  };
}

export function adminOrdersToPackingSlips(
  orders: Parameters<typeof adminOrderToPackingSlip>[0][],
): PackingSlipOrder[] {
  return orders.map((order) => adminOrderToPackingSlip(order));
}
