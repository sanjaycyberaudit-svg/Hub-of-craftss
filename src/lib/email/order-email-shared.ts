import { siteConfig } from "@/config/site";
import { formatOrderDateTimeIst } from "@/lib/datetime/india";
import { formatInr } from "@/lib/utils";

export type OrderEmailLineItem = {
  name: string;
  quantity: number;
  unitPrice: number;
  imageUrl: string;
  imageAlt: string;
  productCode: string | null;
};

export type OrderEmailShippingAddress = {
  line1: string | null;
  line2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
};

export function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildEmailBrandHeaderHtml() {
  return `<div style="margin-bottom:20px;font-size:22px;font-weight:700;">${escapeHtml(siteConfig.name)}</div>`;
}

export function buildEmailFooterHtml() {
  const contact = siteConfig.email
    ? ` or contact us at ${escapeHtml(siteConfig.email)}`
    : "";
  return `<p style="margin-top:24px;color:#555;font-size:13px;">Questions? Reply to this email${contact}.</p><p style="color:#888;font-size:12px;">${escapeHtml(siteConfig.url)}</p>`;
}

export function buildEmailLayoutHtml(input: {
  preheader: string;
  bodyHtml: string;
}) {
  return `<!doctype html><html><body style="margin:0;background:#f6f6f6;font-family:Arial,sans-serif;color:#111"><div style="display:none">${escapeHtml(input.preheader)}</div><div style="max-width:600px;margin:24px auto;background:#fff;padding:24px;border-radius:8px">${input.bodyHtml}</div></body></html>`;
}

export function buildOrderMetaBlockHtml(input: {
  orderId: string;
  placedAt: string | Date;
  customerPhone?: string | null;
}) {
  return `<p style="line-height:1.6"><strong>Order #${escapeHtml(input.orderId)}</strong><br/>Placed ${escapeHtml(formatOrderDateTimeIst(input.placedAt))}${input.customerPhone ? `<br/>Phone: ${escapeHtml(input.customerPhone)}` : ""}</p>`;
}

export function buildLineItemsPlainText(items: OrderEmailLineItem[]) {
  return items.map(
    (item) =>
      `- ${item.name}${item.productCode ? ` (${item.productCode})` : ""} × ${item.quantity} — ${formatInr(item.unitPrice * item.quantity)}`,
  );
}

export function buildLineItemsTableHtml(items: OrderEmailLineItem[]) {
  const rows = items
    .map(
      (item) =>
        `<tr><td style="padding:8px 0;border-bottom:1px solid #eee">${escapeHtml(item.name)}${item.productCode ? `<br/><small>Code: ${escapeHtml(item.productCode)}</small>` : ""}</td><td style="text-align:right;border-bottom:1px solid #eee">${item.quantity} × ${escapeHtml(formatInr(item.unitPrice))}</td></tr>`,
    )
    .join("");
  return `<table width="100%" cellspacing="0">${rows}</table>`;
}
