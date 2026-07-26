import InfoPage from "@/components/layouts/InfoPage";
import {
  resolveStorefrontContact,
  resolveStorefrontSocial,
} from "@/lib/integrations/settings";
import { ORDER_SHIPPING } from "@/lib/storefront/order-shipping";
import { whatsAppHrefFromPhone } from "@/lib/contact/links";
import Link from "next/link";
import { Metadata } from "next";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Shipping & Returns | Hub of craftss",
  description:
    "Simple order processing and delivery times for Hub of craftss — Tamil Nadu, India, and international.",
};

const FALLBACK_EMAIL = "artbyshaaru@gmail.com";
const FALLBACK_WHATSAPP = "https://wa.me/918870669160";

export default async function ShippingReturnsPage() {
  const [contact, social] = await Promise.all([
    resolveStorefrontContact(),
    resolveStorefrontSocial(),
  ]);

  const email = (contact.email || FALLBACK_EMAIL).trim();
  const whatsappHref =
    social.whatsapp ||
    (contact.phoneHref
      ? whatsAppHrefFromPhone(contact.phoneHref)
      : FALLBACK_WHATSAPP);

  return (
    <InfoPage
      heading="Order processing & shipping"
      description="Simple guide to how long orders take — so every buyer knows what to expect."
    >
      <section className="space-y-3">
        <h2 className="text-base font-semibold text-foreground">
          Getting your order ready
        </h2>
        <p>
          We need <strong>{ORDER_SHIPPING.processing}</strong> to prepare your
          order. {ORDER_SHIPPING.processingNote}
        </p>
        <p>{ORDER_SHIPPING.readyStock}</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-foreground">
          Delivery time
        </h2>
        <ul className="list-disc space-y-1.5 pl-5">
          {ORDER_SHIPPING.regions.map((row) => (
            <li key={row.place}>
              <strong>{row.place}:</strong> {row.time}
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-foreground">
          Tracking your order
        </h2>
        <p>{ORDER_SHIPPING.tracking}</p>
        <p>
          If you do not get a dispatch email within{" "}
          <strong>10–15 working days</strong>, please contact us:
        </p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            Email:{" "}
            <Link
              href={`mailto:${email}`}
              className="text-primary hover:underline"
            >
              {email}
            </Link>
          </li>
          <li>
            WhatsApp:{" "}
            <Link
              href={whatsappHref}
              className="text-primary hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Chat with us
            </Link>
            {contact.phone ? ` (${contact.phone})` : " (8870669160)"}
          </li>
          {contact.phone ? (
            <li>
              Call:{" "}
              <Link
                href={contact.phoneHref}
                className="text-primary hover:underline"
              >
                {contact.phone}
              </Link>
            </li>
          ) : null}
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-foreground">
          Wholesale orders
        </h2>
        <p>{ORDER_SHIPPING.wholesale}</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-foreground">
          Returns & exchanges
        </h2>
        <p>
          Returns or exchanges may be accepted within <strong>7 days</strong> of
          delivery for unused items with original packaging intact.
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Please call or WhatsApp us before sending any item back.</li>
          <li>Customised, opened, or used craft kits cannot be returned.</li>
          <li>
            Shipping charges for returns may apply unless the item is faulty.
          </li>
        </ul>
      </section>
    </InfoPage>
  );
}
