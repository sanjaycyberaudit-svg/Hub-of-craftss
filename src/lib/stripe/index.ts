import { env } from "@/env.mjs";
import type Stripe from "stripe";

let stripePromise: Promise<Stripe> | null = null;

/** Lazy Stripe client — keeps the SDK out of cold paths on Workers Free. */
export async function getStripe(): Promise<Stripe> {
  if (!stripePromise) {
    stripePromise = import("stripe").then(
      ({ default: StripeClient }) =>
        new StripeClient(env.STRIPE_SECRET_KEY, {
          apiVersion: "2023-10-16",
          appInfo: {
            name: "HiyoRi",
            version: "0.1.0",
          },
        }),
    );
  }
  return stripePromise;
}
