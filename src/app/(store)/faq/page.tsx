import InfoPage from "@/components/layouts/InfoPage";
import { resolveStorefrontContact } from "@/lib/integrations/settings";
import Link from "next/link";
import { Metadata } from "next";
import { STOREFRONT_STATIC_REVALIDATE_SECONDS } from "@/lib/cache/constants";

export const revalidate = STOREFRONT_STATIC_REVALIDATE_SECONDS;

export const metadata: Metadata = {
  title: "FAQ | SRI SAI RAGHAVENDRA TEX",
  description:
    "Frequently asked questions about SRI SAI RAGHAVENDRA TEX sarees",
};

const faqs = [
  {
    q: "Do you sell wholesale?",
    a: "Yes. We offer wholesale and bulk pricing for retailers and wedding orders. Contact us on WhatsApp or email with your requirements.",
  },
  {
    q: "How do I track my order?",
    a: "After checkout you will receive confirmation. Log in and visit My Orders, or call us with your order number for an update.",
  },
  {
    q: "Can I visit your store?",
    a: "Yes. We are located in Elampillai, Salem district. See our Contact page for the full address and phone number.",
  },
  {
    q: "Are the sarees pure silk?",
    a: "Each product listing describes the fabric type. Categories include Kanjivaram, soft silk, cotton, silk cotton, and more. Ask us if you need help choosing.",
  },
  {
    q: "How do returns work?",
    a: "Unused sarees with tags may be returned within 7 days. Please read our Shipping & Returns page and call us before sending anything back.",
  },
];

export default async function FaqPage() {
  const contact = await resolveStorefrontContact();

  return (
    <InfoPage
      heading="FAQ"
      description="Answers to common questions about shopping with SRI SAI RAGHAVENDRA TEX."
    >
      <ul className="space-y-6">
        {faqs.map(({ q, a }) => (
          <li key={q}>
            <h2 className="text-base font-semibold text-foreground">{q}</h2>
            <p className="mt-1">{a}</p>
          </li>
        ))}
      </ul>

      <p className="pt-4">
        Still have a question?{" "}
        <Link href="/contact" className="text-primary hover:underline">
          Contact us
        </Link>{" "}
        or call{" "}
        <Link href={contact.phoneHref} className="text-primary hover:underline">
          {contact.phone}
        </Link>
        .
      </p>
    </InfoPage>
  );
}
