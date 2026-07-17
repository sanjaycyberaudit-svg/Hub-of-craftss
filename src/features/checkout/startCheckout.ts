import type { CartItems } from "@/features/carts";
import type { SavedShippingAddress } from "@/features/addresses/validations/addressFormSchema";
import type { CheckoutProgressUpdate } from "@/features/checkout/checkout-progress";
import {
  creatingOrderProgress,
  openingPaymentProgress,
  preparingPaymentProgress,
} from "@/features/checkout/checkout-progress";
import { fetchWithTimeout } from "@/lib/network/fetchWithTimeout";
import {
  openCashfreeCheckout,
  parseCashfreeCheckoutSessionPayload,
} from "@/lib/payments/cashfree-checkout-client";

type StartCheckoutParams = {
  order: CartItems;
  guest: boolean;
  shipping: SavedShippingAddress;
  promoCode?: string | null;
  onProgress?: (update: CheckoutProgressUpdate) => void;
};

const CHECKOUT_SESSION_TIMEOUT_MS = 45_000;

export async function startCheckout({
  order,
  guest,
  shipping,
  promoCode,
  onProgress,
}: StartCheckoutParams) {
  onProgress?.(creatingOrderProgress());

  const res = await fetchWithTimeout("/api/create-checkout-session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      orderProducts: order,
      guest,
      shipping: {
        addressId: shipping.addressId,
        fullName: shipping.fullName,
        email: shipping.email,
        mobile: shipping.mobile,
        state: shipping.state,
      },
      promoCode: promoCode ?? null,
    }),
    timeoutMs: CHECKOUT_SESSION_TIMEOUT_MS,
  });

  if (!res.ok) {
    const payload = (await res.json().catch(() => null)) as {
      message?: string;
    } | null;
    const message = payload?.message || "Checkout failed";
    throw new Error(message);
  }

  const payload = (await res.json()) as Record<string, unknown>;

  if (payload.provider === "cashfree") {
    onProgress?.(preparingPaymentProgress());
    const session = parseCashfreeCheckoutSessionPayload(payload);
    onProgress?.(openingPaymentProgress("cashfree"));
    openCashfreeCheckout({ payload: session });
    return;
  }

  if (payload.provider === "phonepe") {
    const redirectUrl = String(payload.redirectUrl ?? "").trim();
    if (!redirectUrl) {
      throw new Error("PhonePe checkout could not be started.");
    }
    onProgress?.(openingPaymentProgress("phonepe"));
    window.location.assign(redirectUrl);
    return;
  }

  throw new Error("Unsupported payment provider.");
}
