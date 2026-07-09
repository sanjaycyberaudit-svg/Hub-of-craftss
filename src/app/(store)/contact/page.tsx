import InfoPage from "@/components/layouts/InfoPage";
import {
  resolveStorefrontContact,
  resolveStorefrontSocial,
} from "@/lib/integrations/settings";
import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact | SRI SAI RAGHAVENDRA TEX",
  description:
    "Contact SRI SAI RAGHAVENDRA TEX — phone, email, WhatsApp, and store address",
};

export const revalidate = 60;

export default async function ContactPage() {
  const [social, contact] = await Promise.all([
    resolveStorefrontSocial(),
    resolveStorefrontContact(),
  ]);

  return (
    <InfoPage
      heading="Contact Us"
      description="Reach SRI SAI RAGHAVENDRA TEX by phone, WhatsApp, email, or visit our store in Salem."
    >
      <section id="store" className="space-y-3">
        <h2 className="text-base font-semibold text-foreground">
          Visit our store
        </h2>
        <address className="not-italic space-y-0.5">
          {contact.addressLines.map((line) => (
            <p key={line}>{line}</p>
          ))}
          {contact.gstin ? (
            <p className="pt-2 text-muted-foreground">
              <span className="font-medium text-foreground">GSTIN: </span>
              {contact.gstin}
            </p>
          ) : null}
          {contact.email ? (
            <p>
              <Link
                href={`mailto:${contact.email}`}
                className="text-primary hover:underline"
              >
                {contact.email}
              </Link>
            </p>
          ) : null}
        </address>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-foreground">Phone</h2>
        <ul className="space-y-1.5">
          {contact.contacts.map((person) => (
            <li key={person.phoneHref}>
              <span className="font-medium text-foreground">{person.name}</span>
              {" — "}
              <Link
                href={person.phoneHref}
                className="text-primary hover:underline"
              >
                {person.phone}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-foreground">WhatsApp</h2>
        <p>
          Fastest way to ask about stock, wedding orders, or delivery —{" "}
          <Link
            href={social.whatsapp}
            className="text-primary hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            Chat on WhatsApp
          </Link>
        </p>
      </section>

      {social.instagram || social.facebook || social.youtube ? (
        <section className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">Follow us</h2>
          <ul className="space-y-1">
            {social.instagram ? (
              <li>
                <Link
                  href={social.instagram}
                  className="text-primary hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Instagram
                </Link>
              </li>
            ) : null}
            {social.facebook ? (
              <li>
                <Link
                  href={social.facebook}
                  className="text-primary hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Facebook
                </Link>
              </li>
            ) : null}
            {social.youtube ? (
              <li>
                <Link
                  href={social.youtube}
                  className="text-primary hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  YouTube
                </Link>
              </li>
            ) : null}
          </ul>
        </section>
      ) : null}
    </InfoPage>
  );
}
