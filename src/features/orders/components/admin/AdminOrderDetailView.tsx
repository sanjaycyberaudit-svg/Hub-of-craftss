"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CheckSquare,
  Copy,
  ExternalLink,
  FileDown,
  Loader2,
  PackageCheck,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/components/ui/use-toast";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatOrderDateTimeIst } from "@/lib/datetime/india";
import { displayInternalOrderRef } from "@/lib/orders/internal-order-ref";
import {
  adminOrderToPackingSlip,
  adminOrderToPdfLabel,
} from "@/lib/pdf/admin-order-pdf-label";
import { downloadOrderPdf as downloadPackingSlipPdf } from "@/lib/pdf/packing-slip-pdf";
import {
  downloadOrderPdf,
  PdfAddressTooLongError,
} from "@/lib/pdf/shipping-label-pdf";
import { formatPrice } from "@/lib/utils";
import { AdminCheckoutOutcomeBadge } from "@/features/orders/components/admin/AdminCheckoutOutcomeBadge";
import type {
  CheckoutOutcome,
  CheckoutTelemetryState,
} from "@/lib/checkout/checkout-outcome";
import { buildDispatchNotificationText } from "@/lib/dispatch/dispatch-message";
import type { OrderDispatchInfo } from "@/lib/dispatch/get-order-dispatch-info";

type DispatchCourierOption = {
  id: string;
  name: string;
  trackingUrlTemplate: string | null;
};

type OrderItemView = {
  id: string;
  productId: string;
  productName: string;
  productSlug: string | null;
  productCode: string | null;
  imageUrl: string;
  imageAlt: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

type Props = {
  order: {
    id: string;
    internalRef: string | null;
    createdAt: string;
    amount: number;
    currency: string;
    orderStatus: string | null;
    paymentStatus: string;
    paymentProvider: string | null;
    paymentMethod: string | null;
    paymentReference: string | null;
    customerName: string | null;
    customerEmail: string | null;
    customerMobile: string | null;
    shippingAddress: {
      line1: string | null;
      line2: string | null;
      city: string | null;
      state: string | null;
      postalCode: string | null;
      country: string | null;
    } | null;
    checkoutOutcome: CheckoutOutcome | null;
    checkoutTelemetry: CheckoutTelemetryState | null;
  };
  items: OrderItemView[];
  copyAddressText: string;
  courierCopyText: string;
  dispatchCouriers: DispatchCourierOption[];
  dispatchInfo: OrderDispatchInfo | null;
  dispatchNotificationText: string | null;
  adminUserId: string;
};

async function copyTextToClipboard(text: string) {
  if (
    typeof navigator !== "undefined" &&
    navigator.clipboard &&
    window.isSecureContext
  ) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textArea = document.createElement("textarea");
  textArea.value = text;
  textArea.style.position = "fixed";
  textArea.style.left = "-9999px";
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();
  document.execCommand("copy");
  textArea.remove();
}

export function AdminOrderDetailView({
  order,
  items,
  copyAddressText,
  courierCopyText,
  dispatchCouriers,
  dispatchInfo,
  dispatchNotificationText,
  adminUserId,
}: Props) {
  const { toast } = useToast();
  const router = useRouter();
  const [packedMap, setPackedMap] = useState<Record<string, boolean>>({});
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [downloadingPackingSlip, setDownloadingPackingSlip] = useState(false);
  const [dispatchOpen, setDispatchOpen] = useState(false);
  const [couriers, setCouriers] = useState(dispatchCouriers);
  const [courierId, setCourierId] = useState(dispatchCouriers[0]?.id ?? "");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [newCourierName, setNewCourierName] = useState("");
  const [newCourierTemplate, setNewCourierTemplate] = useState("");
  const [showAddCourier, setShowAddCourier] = useState(false);
  const [savingCourier, setSavingCourier] = useState(false);
  const [dispatching, setDispatching] = useState(false);
  const [dispatchError, setDispatchError] = useState<string | null>(null);

  const packedCount = useMemo(
    () => Object.values(packedMap).filter(Boolean).length,
    [packedMap],
  );

  const allPacked = items.length > 0 && packedCount === items.length;

  const isPaid = ["paid", "success", "captured"].includes(
    order.paymentStatus.trim().toLowerCase(),
  );
  const orderStatusNorm = (order.orderStatus ?? "").trim().toLowerCase();
  const canDispatch = isPaid && orderStatusNorm === "preparing";
  const selectedCourier = couriers.find((courier) => courier.id === courierId);

  useEffect(() => {
    const remembered = window.localStorage.getItem(
      `dispatch:lastCourier:${adminUserId}`,
    );
    if (remembered && couriers.some((courier) => courier.id === remembered)) {
      setCourierId(remembered);
    }
  }, [adminUserId, couriers]);

  async function saveCourier() {
    setSavingCourier(true);
    setDispatchError(null);
    try {
      const response = await fetch("/api/admin/dispatch-couriers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newCourierName,
          trackingUrlTemplate: newCourierTemplate || null,
        }),
      });
      const payload = await response.json();
      if (!response.ok)
        throw new Error(payload.message || "Could not save courier.");
      setCouriers((current) =>
        [
          ...current.filter((item) => item.id !== payload.courier.id),
          payload.courier,
        ].sort((a, b) => a.name.localeCompare(b.name)),
      );
      setCourierId(payload.courier.id);
      setNewCourierName("");
      setNewCourierTemplate("");
      setShowAddCourier(false);
    } catch (error) {
      setDispatchError(
        error instanceof Error ? error.message : "Could not save courier.",
      );
    } finally {
      setSavingCourier(false);
    }
  }

  async function dispatchOrder() {
    if (!courierId) return setDispatchError("Please select a courier.");
    setDispatching(true);
    setDispatchError(null);
    try {
      const response = await fetch(`/api/admin/orders/${order.id}/dispatch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courierId,
          trackingNumber: trackingNumber || null,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || "Dispatch failed.");
      window.localStorage.setItem(
        `dispatch:lastCourier:${adminUserId}`,
        courierId,
      );
      const notificationText = buildDispatchNotificationText({
        orderId: order.id,
        customerName: order.customerName,
        courierName: payload.courier.name,
        trackingNumber: payload.trackingNumber,
        dispatchedAt: payload.dispatchedAt,
        trackingUrlTemplate: selectedCourier?.trackingUrlTemplate,
      });
      await copyTextToClipboard(notificationText);
      toast({
        title: "Order dispatched",
        description: "Dispatch message copied to the clipboard.",
      });
      setDispatchOpen(false);
      router.refresh();
    } catch (error) {
      setDispatchError(
        error instanceof Error ? error.message : "Dispatch failed.",
      );
    } finally {
      setDispatching(false);
    }
  }

  const copyHandler = async (text: string, label: string) => {
    try {
      await copyTextToClipboard(text);
      toast({
        title: `${label} copied`,
        description: "Ready to paste in courier / WhatsApp.",
      });
    } catch (error) {
      toast({
        title: `Failed to copy ${label.toLowerCase()}`,
        description: error instanceof Error ? error.message : "Please retry.",
        variant: "destructive",
      });
    }
  };

  const downloadPdf = async () => {
    if (downloadingPdf) return;
    setDownloadingPdf(true);
    try {
      await downloadOrderPdf(
        adminOrderToPdfLabel({
          id: order.id,
          internalRef: order.internalRef,
          copyAddressText,
        }),
      );
      toast({
        title: "PDF downloaded",
        description: "Shipping label PDF saved to your downloads.",
      });
    } catch (error) {
      const message =
        error instanceof PdfAddressTooLongError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Unknown error";
      toast({
        title: "Failed to generate PDF",
        description: message,
        variant: "destructive",
      });
    } finally {
      setDownloadingPdf(false);
    }
  };

  const downloadPackingSlip = async () => {
    if (downloadingPackingSlip) return;
    setDownloadingPackingSlip(true);
    try {
      await downloadPackingSlipPdf(
        adminOrderToPackingSlip({
          id: order.id,
          internalRef: order.internalRef,
          createdAt: order.createdAt,
          customerName: order.customerName,
          customerMobile: order.customerMobile,
          shippingAddress: order.shippingAddress,
          lines: items.map((item) => ({
            id: item.id,
            quantity: item.quantity,
            productName: item.productName,
            productCode: item.productCode,
            imageUrl: item.imageUrl,
            imageAlt: item.imageAlt,
          })),
        }),
      );
      toast({
        title: "Packing slip downloaded",
        description: "Packing slip PDF saved to your downloads.",
      });
    } catch (error) {
      toast({
        title: "Failed to generate packing slip",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setDownloadingPackingSlip(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline">
          <Link href="/admin/orders">Back to Orders</Link>
        </Button>
        {isPaid ? (
          <>
            <Button
              onClick={() => void downloadPdf()}
              disabled={downloadingPdf}
              title="Download shipping label PDF"
            >
              {downloadingPdf ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <FileDown className="mr-2 h-4 w-4" />
              )}
              {downloadingPdf ? "Generating…" : "Label PDF"}
            </Button>
            <Button
              variant="outline"
              onClick={() => void downloadPackingSlip()}
              disabled={downloadingPackingSlip}
              title="Download packing slip PDF"
            >
              {downloadingPackingSlip ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <FileDown className="mr-2 h-4 w-4" />
              )}
              {downloadingPackingSlip ? "Generating…" : "Packing slip"}
            </Button>
          </>
        ) : null}
        {canDispatch ? (
          <Button
            onClick={() => {
              setDispatchError(null);
              setDispatchOpen(true);
            }}
          >
            <PackageCheck className="mr-2 h-4 w-4" />
            Dispatch
          </Button>
        ) : null}
        <Button
          variant="outline"
          onClick={() => void copyHandler(copyAddressText, "Address")}
        >
          <Copy className="mr-2 h-4 w-4" />
          Copy Address
        </Button>
        <Button
          onClick={() => void copyHandler(courierCopyText, "Courier text")}
        >
          <PackageCheck className="mr-2 h-4 w-4" />
          Copy Courier Text
        </Button>
        {dispatchNotificationText ? (
          <Button
            variant="outline"
            onClick={() =>
              void copyHandler(dispatchNotificationText, "Dispatch message")
            }
          >
            <Copy className="mr-2 h-4 w-4" />
            Copy Dispatch Message
          </Button>
        ) : null}
        {dispatchInfo?.trackingUrl ? (
          <Button asChild variant="outline">
            <a
              href={dispatchInfo.trackingUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              Open Tracking
            </a>
          </Button>
        ) : null}
      </div>

      <Dialog open={dispatchOpen} onOpenChange={setDispatchOpen}>
        <DialogContent className="sm:max-w-lg">
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold">Dispatch order</h2>
              <p className="text-sm text-muted-foreground">
                Choose a courier and optionally add a tracking number.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="dispatch-courier">Courier</Label>
              <select
                id="dispatch-courier"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={courierId}
                onChange={(event) => setCourierId(event.target.value)}
                disabled={dispatching || showAddCourier}
              >
                <option value="">Select courier</option>
                {couriers.map((courier) => (
                  <option key={courier.id} value={courier.id}>
                    {courier.name}
                  </option>
                ))}
              </select>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setShowAddCourier((value) => !value)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add new courier
              </Button>
            </div>
            {showAddCourier ? (
              <div className="space-y-3 rounded-md border p-3">
                <div className="space-y-2">
                  <Label htmlFor="new-courier-name">Courier name</Label>
                  <Input
                    id="new-courier-name"
                    value={newCourierName}
                    onChange={(event) => setNewCourierName(event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-courier-template">
                    Tracking URL template (optional)
                  </Label>
                  <Input
                    id="new-courier-template"
                    value={newCourierTemplate}
                    placeholder="https://track.example.com/{tracking}"
                    onChange={(event) =>
                      setNewCourierTemplate(event.target.value)
                    }
                  />
                </div>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => void saveCourier()}
                  disabled={savingCourier || newCourierName.trim().length < 2}
                >
                  {savingCourier ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Save courier
                </Button>
              </div>
            ) : null}
            <div className="space-y-2">
              <Label htmlFor="tracking-number">
                Tracking number (optional)
              </Label>
              <Input
                id="tracking-number"
                value={trackingNumber}
                onChange={(event) => setTrackingNumber(event.target.value)}
                disabled={dispatching}
              />
            </div>
            {dispatchError ? (
              <p className="text-sm text-destructive">{dispatchError}</p>
            ) : null}
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDispatchOpen(false)}
                disabled={dispatching}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => void dispatchOrder()}
                disabled={dispatching || !courierId || showAddCourier}
              >
                {dispatching ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Confirm dispatch
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Items to Pack</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border bg-muted/30 px-3 py-2">
              <div className="text-sm text-muted-foreground">
                Packed {packedCount}/{items.length}
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  setPackedMap(
                    allPacked
                      ? {}
                      : Object.fromEntries(
                          items.map((item) => [item.id, true]),
                        ),
                  )
                }
              >
                <CheckSquare className="mr-2 h-4 w-4" />
                {allPacked ? "Clear packed" : "Mark all packed"}
              </Button>
            </div>

            <div className="space-y-3">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 rounded-md border p-3"
                >
                  <Checkbox
                    checked={Boolean(packedMap[item.id])}
                    onCheckedChange={(checked) =>
                      setPackedMap((prev) => ({
                        ...prev,
                        [item.id]: Boolean(checked),
                      }))
                    }
                    aria-label={`Mark ${item.productName} as packed`}
                  />
                  <div className="relative h-14 w-14 overflow-hidden rounded-md border bg-muted">
                    <Image
                      src={item.imageUrl}
                      alt={item.imageAlt}
                      fill
                      className="object-cover"
                      sizes="56px"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    {item.productSlug ? (
                      <Link
                        href={`/shop/${item.productSlug}`}
                        className="line-clamp-1 text-sm font-medium hover:underline"
                        target="_blank"
                      >
                        {item.productName}
                      </Link>
                    ) : (
                      <p className="line-clamp-1 text-sm font-medium">
                        {item.productName}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Code: {item.productCode ?? "—"} • Qty: {item.quantity} •
                      Unit: {formatPrice(item.unitPrice)}
                    </p>
                  </div>
                  <div className="text-sm font-semibold">
                    {formatPrice(item.lineTotal)}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {dispatchInfo ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Dispatch Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p>
                  <span className="text-muted-foreground">Courier:</span>{" "}
                  {dispatchInfo.courierName}
                </p>
                <p>
                  <span className="text-muted-foreground">Dispatched:</span>{" "}
                  {formatOrderDateTimeIst(dispatchInfo.dispatchedAt)}
                </p>
                {dispatchInfo.trackingNumber ? (
                  <p className="break-all">
                    <span className="text-muted-foreground">Tracking:</span>{" "}
                    {dispatchInfo.trackingNumber}
                  </p>
                ) : null}
              </CardContent>
            </Card>
          ) : null}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>
                <span className="text-muted-foreground">Order ID:</span>{" "}
                {order.id}
              </p>
              {order.internalRef ? (
                <p>
                  <span className="text-muted-foreground">Internal Ref:</span>{" "}
                  <span className="font-semibold tabular-nums">
                    {displayInternalOrderRef(order.internalRef)}
                  </span>
                </p>
              ) : null}
              <p>
                <span className="text-muted-foreground">Placed:</span>{" "}
                {formatOrderDateTimeIst(order.createdAt)}
              </p>
              <p>
                <span className="text-muted-foreground">Amount:</span>{" "}
                {formatPrice(order.amount, order.currency.toUpperCase())}
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                <Badge variant="outline" className="capitalize">
                  {(order.orderStatus ?? "pending").trim().toLowerCase()}
                </Badge>
                <Badge variant="outline" className="capitalize">
                  {order.paymentStatus}
                </Badge>
              </div>
              <p className="pt-1 text-xs text-muted-foreground">
                {order.paymentProvider
                  ? `Provider: ${order.paymentProvider}`
                  : "Provider: -"}
                {order.paymentMethod ? ` • Method: ${order.paymentMethod}` : ""}
              </p>
              {order.paymentReference ? (
                <p className="break-all text-xs text-muted-foreground">
                  Ref: {order.paymentReference}
                </p>
              ) : null}
              {order.checkoutOutcome ? (
                <div className="pt-2">
                  <AdminCheckoutOutcomeBadge
                    outcome={order.checkoutOutcome}
                    showDetail
                  />
                </div>
              ) : null}
              {order.checkoutTelemetry?.events?.length ? (
                <div className="space-y-1 pt-2">
                  <p className="text-xs font-medium text-muted-foreground">
                    Checkout events
                  </p>
                  <ul className="space-y-1 text-xs text-muted-foreground">
                    {order.checkoutTelemetry.events
                      .slice()
                      .reverse()
                      .map((event) => (
                        <li key={`${event.at}-${event.type}`}>
                          {event.type.replaceAll("_", " ")}
                          {event.reason ? ` — ${event.reason}` : ""}
                        </li>
                      ))}
                  </ul>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Customer & Address</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="rounded-md border bg-muted/20 p-3 leading-6">
                <p className="font-medium">
                  {order.customerName ?? "Guest customer"}
                </p>
                {order.shippingAddress ? (
                  <>
                    {[
                      order.shippingAddress.line1,
                      order.shippingAddress.line2,
                      [order.shippingAddress.city, order.shippingAddress.state]
                        .filter(Boolean)
                        .join(", "),
                    ]
                      .filter(Boolean)
                      .map((line) => (
                        <p key={String(line)}>{line}</p>
                      ))}
                    <p>{order.shippingAddress.postalCode ?? "-"}</p>
                  </>
                ) : (
                  <p>Address not available for this order.</p>
                )}
                <p className="font-medium">{order.customerMobile ?? "-"}</p>
              </div>
              {order.customerEmail ? (
                <p className="break-all text-xs text-muted-foreground">
                  {order.customerEmail}
                </p>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default AdminOrderDetailView;
