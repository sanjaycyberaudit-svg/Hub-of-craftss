import InfoPage from "@/components/layouts/InfoPage";
import { siteConfig } from "@/config/site";
import Link from "next/link";
import { Metadata } from "next";
import { STOREFRONT_STATIC_REVALIDATE_SECONDS } from "@/lib/cache/constants";

export const revalidate = STOREFRONT_STATIC_REVALIDATE_SECONDS;

export const metadata: Metadata = {
  title: "Payment Methods | SRI SAI RAGHAVENDRA TEX",
  description: "How to pay for sarees at SRI SAI RAGHAVENDRA TEX",
};

export default function PaymentMethodsPage() {
  return (
    <InfoPage
      heading="Payment Methods"
      description="Secure online checkout and in-store payment options."
    >
      <section className="space-y-3">
        <h2 className="text-base font-semibold text-foreground">
          Online orders
        </h2>
        <p>
          When you checkout on our website, you can pay securely using major
          debit and credit cards through our payment partner (Stripe). All
          transactions are processed in <strong>Indian Rupees (INR)</strong>.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-foreground">In-store</h2>
        <p>
          Visit us at our Salem showroom to pay by cash, UPI, or card. Our team
          can help you choose sarees for weddings, festivals, and daily wear.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-foreground">
          WhatsApp orders
        </h2>
        <p>
          For large or custom orders, you may arrange payment via UPI or bank
          transfer after confirming details on{" "}
          <Link
            href={siteConfig.social.whatsapp}
            className="text-primary hover:underline"
          >
            WhatsApp
          </Link>
          .
        </p>
      </section>
    </InfoPage>
  );
}
