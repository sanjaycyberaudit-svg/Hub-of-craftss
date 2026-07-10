import InfoPage from "@/components/layouts/InfoPage";
import {
  resolveStorefrontContact,
  resolveStorefrontSocial,
} from "@/lib/integrations/settings";
import Link from "next/link";
import { Metadata } from "next";
import { STOREFRONT_STATIC_REVALIDATE_SECONDS } from "@/lib/cache/constants";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Shipping & Returns | Hub of craftss",
  description: "Delivery and return policy for Hub of craftss sarees",
};

export default async function ShippingReturnsPage() {
  const [contact, social] = await Promise.all([
    resolveStorefrontContact(),
    resolveStorefrontSocial(),
  ]);

  return (
    <InfoPage
      heading="Shipping & Returns"
      description="How we deliver across Tamil Nadu and India, and our exchange policy for sarees."
    >
      <section className="space-y-3">
        <h2 className="text-base font-semibold text-foreground">Shipping</h2>
        <p>
          We ship sarees across Tamil Nadu and throughout India. Delivery time
          is typically 3–7 business days depending on your location. For bulk or
          wedding orders, please contact us on WhatsApp for a custom quote and
          timeline.
        </p>
        <p>
          Free delivery may apply on selected orders — message us on{" "}
          <Link href={social.whatsapp} className="text-primary hover:underline">
            WhatsApp
          </Link>{" "}
          before placing your order.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-foreground">
          Returns & exchanges
        </h2>
        <p>
          Returns or exchanges may be accepted within <strong>7 days</strong> of
          delivery for unused sarees with original tags and packaging intact.
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Please call or WhatsApp us before sending any item back.</li>
          <li>Customised, altered, or worn sarees cannot be returned.</li>
          <li>
            Shipping charges for returns may apply unless the item is faulty.
          </li>
        </ul>
      </section>

      <p>
        Questions? Call{" "}
        <Link href={contact.phoneHref} className="text-primary hover:underline">
          {contact.phone}
        </Link>
        .
      </p>
    </InfoPage>
  );
}
