import { siteConfig } from "@/config/site";
import { formatOrderDateTimeIst } from "@/lib/datetime/india";
import {
  buildEmailBrandHeaderHtml,
  buildEmailFooterHtml,
  buildEmailLayoutHtml,
  buildLineItemsPlainText,
  buildLineItemsTableHtml,
  buildOrderMetaBlockHtml,
  escapeHtml,
  type OrderEmailLineItem,
  type OrderEmailShippingAddress,
} from "./order-email-shared";
import { buildShippingAddressLines } from "@/lib/orders/shipping-address-text";

export type OrderDispatchEmailInput = {
  orderId: string;
  customerName: string | null;
  customerEmail: string;
  createdAt: string | Date;
  customerPhone: string | null;
  lineItems: OrderEmailLineItem[];
  shippingAddress: OrderEmailShippingAddress | null;
  orderUrl: string;
  courierName: string;
  trackingNumber: string | null;
  trackingUrl: string | null;
  dispatchedAt: string;
};

export function buildOrderDispatchSubject(orderId: string) {
  return `Your order has shipped — #${orderId} · ${siteConfig.name}`;
}

function addressLines(input: OrderDispatchEmailInput) {
  return buildShippingAddressLines(
    input.shippingAddress
      ? {
          line1: input.shippingAddress.line1,
          line2: input.shippingAddress.line2,
          city: input.shippingAddress.city,
          state: input.shippingAddress.state,
          postalCode: input.shippingAddress.postalCode,
          country: input.shippingAddress.country,
        }
      : null,
  );
}

export function buildOrderDispatchPlainText(input: OrderDispatchEmailInput) {
  return [
    `Hi ${input.customerName?.trim() || "there"},`,
    `${siteConfig.name} order #${input.orderId} has been dispatched.`,
    `Dispatched: ${formatOrderDateTimeIst(input.dispatchedAt)}`,
    `Courier: ${input.courierName}`,
    input.trackingNumber ? `Tracking number: ${input.trackingNumber}` : null,
    input.trackingUrl ? `Track package: ${input.trackingUrl}` : null,
    "",
    "Items in this order",
    ...buildLineItemsPlainText(input.lineItems),
    "",
    "Shipping address",
    ...addressLines(input),
    "",
    `View your order: ${input.orderUrl}`,
    siteConfig.url,
  ]
    .filter((line): line is string => line != null)
    .join("\n");
}

export function buildOrderDispatchHtml(input: OrderDispatchEmailInput) {
  const tracking = [
    input.trackingNumber
      ? `<div><strong>Tracking number:</strong> ${escapeHtml(input.trackingNumber)}</div>`
      : "",
    input.trackingUrl
      ? `<p><a href="${escapeHtml(input.trackingUrl)}" style="display:inline-block;background:#111;color:#fff;padding:12px 18px;border-radius:6px;text-decoration:none">Track package</a></p>`
      : "",
  ].join("");
  const bodyHtml = `${buildEmailBrandHeaderHtml()}
    <p>Hi ${escapeHtml(input.customerName?.trim() || "there")},</p>
    <p>Your order is on its way.</p>
    ${buildOrderMetaBlockHtml({ orderId: input.orderId, placedAt: input.createdAt, customerPhone: input.customerPhone })}
    <div style="padding:16px;background:#f8f8f8;border-radius:8px;line-height:1.6"><div><strong>Courier:</strong> ${escapeHtml(input.courierName)}</div><div><strong>Dispatched:</strong> ${escapeHtml(formatOrderDateTimeIst(input.dispatchedAt))}</div>${tracking}</div>
    <h2 style="font-size:16px">Items in this order</h2>${buildLineItemsTableHtml(input.lineItems)}
    <h2 style="font-size:16px">Shipping address</h2><div>${addressLines(input)
      .map((line) => `<div>${escapeHtml(line)}</div>`)
      .join("")}</div>
    <p><a href="${escapeHtml(input.orderUrl)}">View order</a></p>${buildEmailFooterHtml()}`;
  return buildEmailLayoutHtml({
    preheader: `${siteConfig.name} order #${input.orderId} has been dispatched.`,
    bodyHtml,
  });
}
