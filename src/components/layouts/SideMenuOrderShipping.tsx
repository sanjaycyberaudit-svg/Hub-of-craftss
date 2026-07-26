"use client";

import Link from "next/link";
import { Mail } from "lucide-react";
import { SheetClose } from "@/components/ui/sheet";
import { Icons } from "@/components/layouts/icons";
import { ORDER_SHIPPING } from "@/lib/storefront/order-shipping";
import { whatsAppHrefFromPhone } from "@/lib/contact/links";
import { useStorefrontContact } from "@/providers/ShopContactProvider";
import { useStorefrontSocial } from "@/providers/SocialLinksProvider";
import { cn } from "@/lib/utils";

const FALLBACK_EMAIL = "artbyshaaru@gmail.com";
const FALLBACK_WHATSAPP_PHONE = "8870669160";

type Props = {
  className?: string;
};

/**
 * Compact order & shipping summary for the mobile menu —
 * plain language, every key detail, WhatsApp + email icons to contact.
 */
export function SideMenuOrderShipping({ className }: Props) {
  const contact = useStorefrontContact();
  const social = useStorefrontSocial();

  const email = (contact.email || FALLBACK_EMAIL).trim();
  const whatsappHref =
    social.whatsapp ||
    (contact.contacts[0]?.phoneHref
      ? whatsAppHrefFromPhone(contact.contacts[0].phoneHref)
      : `https://wa.me/91${FALLBACK_WHATSAPP_PHONE}`);

  return (
    <section
      className={cn("space-y-2.5", className)}
      aria-labelledby="side-menu-shipping-title"
    >
      <h2
        id="side-menu-shipping-title"
        className="text-[10px] font-semibold uppercase tracking-wide text-primary/70"
      >
        {ORDER_SHIPPING.title}
      </h2>

      <div className="space-y-2 text-[11px] leading-snug text-foreground">
        <p>
          <span className="font-semibold text-foreground">
            {ORDER_SHIPPING.processingLabel}:{" "}
          </span>
          <span className="text-muted-foreground">
            {ORDER_SHIPPING.processing}. {ORDER_SHIPPING.processingNote}
          </span>
        </p>

        <div>
          <p className="font-semibold text-foreground">
            {ORDER_SHIPPING.deliveryLabel}
          </p>
          <ul className="mt-1 space-y-0.5 text-muted-foreground">
            {ORDER_SHIPPING.regions.map((row) => (
              <li key={row.place} className="flex gap-1.5">
                <span className="shrink-0 text-primary/50" aria-hidden>
                  ·
                </span>
                <span>
                  <span className="text-foreground/90">{row.place}</span>
                  {" — "}
                  {row.time}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <p className="text-muted-foreground">{ORDER_SHIPPING.readyStock}</p>
        <p className="text-muted-foreground">{ORDER_SHIPPING.tracking}</p>
        <p className="text-muted-foreground">{ORDER_SHIPPING.noEmail}</p>
        <p className="text-muted-foreground">{ORDER_SHIPPING.wholesale}</p>
      </div>

      <div className="flex items-center gap-2 pt-0.5">
        <a
          href={whatsappHref}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="WhatsApp us about your order"
          title="WhatsApp"
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#25D366]/35 bg-[#25D366]/10 text-[#25D366] transition-colors hover:bg-[#25D366]/18 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#25D366]/40"
        >
          <Icons.whatsapp className="h-4 w-4" />
        </a>
        <a
          href={`mailto:${email}`}
          aria-label={`Email us at ${email}`}
          title="Email"
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-primary/25 bg-primary/10 text-primary transition-colors hover:bg-primary/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        >
          <Mail className="h-4 w-4" strokeWidth={2} />
        </a>
        <SheetClose asChild>
          <Link
            href={ORDER_SHIPPING.fullDetailsHref}
            className="ml-auto text-[10px] font-semibold text-primary underline-offset-2 hover:underline"
          >
            {ORDER_SHIPPING.fullDetailsLabel}
          </Link>
        </SheetClose>
      </div>
    </section>
  );
}
