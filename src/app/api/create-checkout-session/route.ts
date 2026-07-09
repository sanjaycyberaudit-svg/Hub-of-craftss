import { publicErrorMessage } from "@/lib/api/public-error";
import { checkCheckoutRateLimit, getRequestIp } from "@/lib/auth/rate-limit";
import {
  buildCheckoutLineItems,
  buildCheckoutLinePricingRecord,
  calcCheckoutSubtotal,
} from "@/lib/checkout/build-checkout-lines";
import { resolveOrderUserId } from "@/lib/orders/resolve-order-user-id";
import { resolveCheckoutPaymentEnvironment } from "@/lib/orders/checkout-environment";
import { mergePaymentMeta } from "@/lib/orders/payment-meta";
import {
  releaseStockReservation,
  reserveStockInTransaction,
  extendStockReservationExpiry,
  shouldReserveStockAtCheckout,
  StockReservationError,
} from "@/lib/orders/stock-reservation";
import { sweepExpiredStockReservationsIfEnabled } from "@/lib/orders/lazy-stock-reservation-sweep";
import type { CartItems } from "@/features/carts";
import { createPhonePePayment } from "@/lib/payments/phonepe";
import { createCashfreePayment } from "@/lib/payments/cashfree";
import { validatePaymentSessionId } from "@/lib/payments/cashfree-standards";
import { resolveCheckoutPaymentProvider } from "@/lib/payments/resolve-checkout-provider";
import { stripe } from "@/lib/stripe";
import { getProductSizeConfigsByProductIds } from "@/lib/products/sizeConfig";
import db from "@/lib/supabase/db";
import { address, medias, orderLines, orders } from "@/lib/supabase/schema";
import {
  calculateCourierCharge,
  calculateGstAmount,
  getCashfreeConfig,
  getIntegrationSetting,
  getPhonePeConfig,
  INTEGRATION_KEYS,
  resolveCourierChargesConfig,
  resolveOfferCodesConfig,
} from "@/lib/integrations/settings";
import { createOrderAccessToken } from "@/lib/auth/order-access";
import { getURL } from "@/lib/utils";
import { and, eq, inArray } from "drizzle-orm";

import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

const shippingSchema = z.object({
  addressId: z.string().min(1),
  fullName: z.string().min(2),
  email: z.string().email(),
  mobile: z.string().min(10),
  state: z.string().min(1),
});

const orderProductsSchema = z.object({
  orderProducts: z.record(
    z.object({
      quantity: z.number().min(1),
      size: z.string().trim().max(8).optional(),
    }),
  ),
  guest: z.boolean(),
  shipping: shippingSchema,
  promoCode: z.string().trim().optional().nullable(),
});

type OrderProducts = CartItems;

export async function POST(request: Request) {
  const checkoutLimit = await checkCheckoutRateLimit(
    getRequestIp(request.headers),
  );
  if (checkoutLimit.limited) {
    return NextResponse.json(
      {
        message:
          "Too many checkout attempts. Please wait a minute and try again.",
      },
      { status: 429 },
    );
  }

  const payload = await request.json().catch(() => null);

  const validation = orderProductsSchema.safeParse(payload ?? {});
  const supabase = createRouteHandlerClient({ cookies });

  if (!validation.success)
    return NextResponse.json(
      { message: "Invalid checkout data." },
      { status: 400 },
    );

  const checkout = validation.data;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!checkout.guest) {
    if (!user) {
      return NextResponse.json(
        { message: "Sign in required for account checkout." },
        { status: 401 },
      );
    }

    const [ownedAddress] = await db
      .select({ id: address.id })
      .from(address)
      .where(
        and(
          eq(address.id, checkout.shipping.addressId),
          eq(address.userProfileId, user.id),
        ),
      )
      .limit(1);

    if (!ownedAddress) {
      return NextResponse.json(
        { message: "Invalid shipping address for this account." },
        { status: 403 },
      );
    }
  }

  let createdOrderId: string | null = null;

  try {
    const [
      cashfreeConfig,
      phonePeConfig,
      cashfreeSetting,
      phonepeSetting,
      courierConfig,
      offerCodesConfig,
    ] = await Promise.all([
      getCashfreeConfig(),
      getPhonePeConfig(),
      getIntegrationSetting(INTEGRATION_KEYS.cashfree),
      getIntegrationSetting(INTEGRATION_KEYS.phonepe),
      resolveCourierChargesConfig(),
      resolveOfferCodesConfig(),
    ]);
    const stockControlSetting = await getIntegrationSetting(
      INTEGRATION_KEYS.stockControl,
    );

    if (stockControlSetting?.isEnabled) {
      await sweepExpiredStockReservationsIfEnabled({
        force: true,
        stockControlEnabled: true,
      });
    }

    if (cashfreeSetting?.isEnabled && !cashfreeConfig) {
      return NextResponse.json(
        {
          message:
            "Cashfree is enabled but configuration is incomplete. Update Client ID, Secret, Base URL and API version in Admin settings.",
        },
        { status: 400 },
      );
    }

    if (phonepeSetting?.isEnabled && !phonePeConfig) {
      return NextResponse.json(
        {
          message:
            "PhonePe is enabled but configuration is incomplete. Update Merchant ID, Salt Key, Salt Index and Base URL in Admin settings.",
        },
        { status: 400 },
      );
    }

    const checkoutProvider = resolveCheckoutPaymentProvider({
      cashfreeConfig,
      phonePeConfig,
    });
    const preferCashfree = checkoutProvider === "cashfree";
    const preferPhonePe = checkoutProvider === "phonepe";

    const productsQuantity = await buildCheckoutLineItems(
      checkout.orderProducts as OrderProducts,
    );
    if (stockControlSetting?.isEnabled) {
      const unavailable = productsQuantity.filter(
        (line) => line.quantity > Math.max(0, Number(line.stock ?? 0)),
      );
      if (unavailable.length > 0) {
        return NextResponse.json(
          {
            message: `${unavailable[0].name} has only ${Math.max(0, Number(unavailable[0].stock ?? 0))} in stock. Please reduce quantity and retry.`,
          },
          { status: 400 },
        );
      }
    }
    const sizeConfigs = await getProductSizeConfigsByProductIds(
      Object.keys(checkout.orderProducts),
    );
    for (const line of productsQuantity) {
      const selectedSize = String(checkout.orderProducts[line.id]?.size ?? "")
        .trim()
        .toUpperCase();
      const sizeConfig = sizeConfigs.get(line.id);
      const selectableOptions =
        sizeConfig?.options.filter((option) => Number(option.qty ?? 0) > 0) ??
        [];
      const hasConfiguredSizes =
        Boolean(sizeConfig?.enabled) && selectableOptions.length > 0;
      if (hasConfiguredSizes) {
        const emptyLabelOption = selectableOptions.find(
          (option) => !String(option.size ?? "").trim(),
        );
        if (!selectedSize && !emptyLabelOption) {
          return NextResponse.json(
            { message: `${line.name}: please select a size.` },
            { status: 400 },
          );
        }
        const sizeOption = selectedSize
          ? selectableOptions.find((option) => option.size === selectedSize)
          : emptyLabelOption ?? null;
        if (!sizeOption) {
          return NextResponse.json(
            { message: `${line.name}: selected size is unavailable.` },
            { status: 400 },
          );
        }
        if (line.quantity > sizeOption.qty) {
          return NextResponse.json(
            {
              message: `${line.name}${selectedSize ? ` (${selectedSize})` : ""} has only ${sizeOption.qty} left.`,
            },
            { status: 400 },
          );
        }
      }
    }

    const subtotalAmount = calcCheckoutSubtotal(productsQuantity);
    const normalizedPromoCode = String(checkout.promoCode ?? "")
      .trim()
      .toUpperCase()
      .replace(/\s+/g, "");
    const matchedOffer =
      offerCodesConfig.enabled && normalizedPromoCode
        ? offerCodesConfig.codes.find(
            (item) => item.enabled && item.code === normalizedPromoCode,
          ) ?? null
        : null;
    if (normalizedPromoCode && !matchedOffer) {
      return NextResponse.json(
        { message: "Invalid or inactive promo code." },
        { status: 400 },
      );
    }
    const discountPercentage = matchedOffer?.percentage ?? 0;
    const discountAmount =
      Math.round(subtotalAmount * discountPercentage * 100) / 10000;
    const discountedSubtotal = Math.max(0, subtotalAmount - discountAmount);
    const totalQuantity = productsQuantity.reduce(
      (sum, item) => sum + item.quantity,
      0,
    );
    const courierBreakdown = calculateCourierCharge({
      state: checkout.shipping.state,
      quantity: totalQuantity,
      config: courierConfig,
    });
    const courierCharge = courierConfig.enabled ? courierBreakdown.charge : 0;
    const gstAmount = calculateGstAmount({
      taxableAmount: discountedSubtotal + courierCharge,
      config: courierConfig,
    });
    const amount = discountedSubtotal + courierCharge + gstAmount;
    const paymentEnvironment = resolveCheckoutPaymentEnvironment({
      preferCashfree,
      preferPhonePe,
      cashfreeConfig,
      phonePeConfig,
    });
    const reserveStock =
      Boolean(stockControlSetting?.isEnabled) &&
      shouldReserveStockAtCheckout(paymentEnvironment);
    const linePricing = buildCheckoutLinePricingRecord(productsQuantity);

    const selectedSizes = Object.fromEntries(
      Object.entries(checkout.orderProducts).map(([id, value]) => [
        id,
        String(value.size ?? "")
          .trim()
          .toUpperCase(),
      ]),
    );
    const productNames = new Map(
      productsQuantity.map((product) => [product.id, product.name]),
    );

    const insertedOrder = await db.transaction(async (tx) => {
      const basePaymentMeta = {
        subtotalAmount,
        discountAmount,
        discountPercentage,
        promoCode: matchedOffer?.code ?? null,
        discountedSubtotal,
        courierCharge,
        gstAmount,
        gstEnabled: courierConfig.gstEnabled,
        gstPercentage: courierConfig.gstPercentage,
        courierState: checkout.shipping.state,
        courierRule: courierBreakdown.ruleApplied,
        totalQuantity,
        paymentEnvironment,
        linePricing,
        sizes: selectedSizes,
      };

      const created = await tx
        .insert(orders)
        .values({
          user_id: resolveOrderUserId(user?.id),
          name: checkout.shipping.fullName,
          email: checkout.shipping.email,
          addressId: checkout.shipping.addressId,
          currency: "inr",
          amount: `${amount}`,
          order_status: "pending",
          payment_status: "unpaid",
          payment_method: preferCashfree
            ? "cashfree"
            : preferPhonePe
              ? "phonepe"
              : "card",
          payment_provider: preferCashfree
            ? "cashfree"
            : preferPhonePe
              ? "phonepe"
              : "stripe",
          customer_mobile: checkout.shipping.mobile,
          payment_meta: basePaymentMeta,
        })
        .returning();

      const featuredImageIds = [
        ...new Set(productsQuantity.map((line) => line.featuredImageId)),
      ];
      const mediaRows =
        featuredImageIds.length > 0
          ? await tx
              .select({ id: medias.id, key: medias.key })
              .from(medias)
              .where(inArray(medias.id, featuredImageIds))
          : [];
      const mediaKeyById = new Map(mediaRows.map((row) => [row.id, row.key]));

      await tx.insert(orderLines).values(
        productsQuantity.map(
          ({
            id,
            quantity,
            pricing,
            name,
            slug,
            productCode,
            featuredImageId,
          }) => ({
            productId: id,
            quantity,
            price: `${pricing.unitPrice}`,
            orderId: created[0].id,
            productNameSnapshot: name,
            productSlugSnapshot: slug,
            productCodeSnapshot: productCode ?? null,
            productImageKeySnapshot: mediaKeyById.get(featuredImageId) ?? null,
          }),
        ),
      );

      if (reserveStock) {
        const reservationMeta = await reserveStockInTransaction(tx, {
          lines: productsQuantity.map((product) => ({
            productId: product.id,
            quantity: product.quantity,
            size: selectedSizes[product.id] || undefined,
          })),
          selectedSizes,
          sizeConfigs,
          productNames,
        });

        const [updatedOrder] = await tx
          .update(orders)
          .set({
            payment_meta: mergePaymentMeta(basePaymentMeta, reservationMeta),
          })
          .where(eq(orders.id, created[0].id))
          .returning();

        return updatedOrder ? [updatedOrder] : created;
      }

      return created;
    });

    const order = insertedOrder[0];
    createdOrderId = order.id;
    const accessToken = createOrderAccessToken(order.id, order.createdAt);

    if (preferCashfree) {
      const payment = await createCashfreePayment({
        orderId: order.id,
        amountInRupees: amount,
        customerName: checkout.shipping.fullName,
        customerMobile: checkout.shipping.mobile,
        customerEmail: checkout.shipping.email,
        customerId: !checkout.guest ? user?.id : undefined,
      });

      if (!payment?.paymentSessionId) {
        throw new Error("Cashfree payment session could not be created");
      }

      if (!validatePaymentSessionId(payment.paymentSessionId)) {
        throw new Error("Cashfree returned an invalid payment session");
      }

      const existingMeta =
        (order.payment_meta as Record<string, unknown> | null) ?? {};

      await db
        .update(orders)
        .set({
          payment_reference:
            payment.cashfreeCfOrderId ?? payment.cashfreeOrderId,
          payment_meta: mergePaymentMeta(existingMeta, {
            cashfreeOrderId: payment.cashfreeOrderId,
            cashfreeCfOrderId: payment.cashfreeCfOrderId,
          }),
        })
        .where(eq(orders.id, order.id));

      await extendStockReservationExpiry(order.id);

      return NextResponse.json({
        provider: "cashfree",
        orderId: order.id,
        accessToken,
        paymentSessionId: payment.paymentSessionId,
        environment: payment.environment,
        returnUrl: payment.returnUrl,
        checkoutOrigin: payment.checkoutOrigin,
        hostedCheckoutUrl: payment.hostedCheckoutUrl,
      });
    }

    if (preferPhonePe) {
      const payment = await createPhonePePayment({
        orderId: order.id,
        amountInRupees: amount,
        customerMobile: checkout.shipping.mobile,
        customerEmail: checkout.shipping.email,
        accessToken,
      });

      if (!payment?.redirectUrl || !payment.merchantTransactionId) {
        throw new Error("PhonePe payment URL could not be created");
      }

      await db
        .update(orders)
        .set({
          phonepe_merchant_transaction_id: payment.merchantTransactionId,
          payment_reference: payment.merchantTransactionId,
        })
        .where(eq(orders.id, order.id));

      await extendStockReservationExpiry(order.id);

      return NextResponse.json({
        provider: "phonepe",
        orderId: order.id,
        accessToken,
        redirectUrl: payment.redirectUrl,
      });
    }

    const successUrl = new URL(`${getURL()}/orders/${order.id}`);
    successUrl.searchParams.set("token", accessToken);

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      billing_address_collection: "required",
      customer_email: checkout.shipping.email,
      phone_number_collection: { enabled: true },
      metadata: {
        customer_mobile: checkout.shipping.mobile,
        shipping_address_id: checkout.shipping.addressId,
      },
      client_reference_id: order.id,
      line_items: [
        {
          price_data: {
            currency: "inr",
            product_data: {
              name: "Order subtotal",
            },
            unit_amount: Math.round(discountedSubtotal * 100),
          },
          quantity: 1,
        },
        ...(courierCharge > 0
          ? [
              {
                price_data: {
                  currency: "inr",
                  product_data: {
                    name: "Courier charge",
                  },
                  unit_amount: Math.round(courierCharge * 100),
                },
                quantity: 1,
              },
            ]
          : []),
        ...(gstAmount > 0
          ? [
              {
                price_data: {
                  currency: "inr",
                  product_data: {
                    name: `GST (${courierConfig.gstPercentage}%)`,
                  },
                  unit_amount: Math.round(gstAmount * 100),
                },
                quantity: 1,
              },
            ]
          : []),
      ],
      mode: "payment",
      allow_promotion_codes: true,
      success_url: successUrl.toString(),
      cancel_url: `${getURL()}/cart`,
    });

    await extendStockReservationExpiry(order.id);

    return NextResponse.json({
      provider: "stripe",
      orderId: order.id,
      accessToken,
      sessionId: session.id,
    });
  } catch (err) {
    if (createdOrderId) {
      await releaseStockReservation(createdOrderId, "checkout_failed", {
        allowOrphanFallback: true,
      }).catch((releaseErr) => {
        console.error("[checkout] stock release failed:", releaseErr);
      });
    }

    if (err instanceof StockReservationError) {
      return NextResponse.json({ message: err.message }, { status: 409 });
    }

    console.error("[checkout] create-checkout-session failed:", err);
    return NextResponse.json(
      {
        message: publicErrorMessage(
          err,
          "Checkout initiation failed. Please retry.",
        ),
      },
      { status: 500 },
    );
  }
}
