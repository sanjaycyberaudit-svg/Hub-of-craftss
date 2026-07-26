"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { Mail } from "lucide-react";
import { SheetClose } from "@/components/ui/sheet";
import { Icons } from "@/components/layouts/icons";
import {
  ORDER_SHIPPING,
  ORDER_SHIPPING_FALLBACK,
} from "@/lib/storefront/order-shipping";
import {
  contactActionHref,
  whatsAppHrefFromPhone,
  type StoreContact,
} from "@/lib/contact/links";
import { useStorefrontContact } from "@/providers/ShopContactProvider";
import { useStorefrontSocial } from "@/providers/SocialLinksProvider";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
};

const iconBtn =
  "inline-flex h-9 w-9 items-center justify-center rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 touch-manipulation";

function usableContacts(contacts: readonly StoreContact[]): StoreContact[] {
  return contacts.filter((c) => c.phoneHref && c.phoneHref !== "tel:");
}

/**
 * Compact order & shipping for the menu — easy words, every key point,
 * WhatsApp + email icons (picker when more than one WhatsApp number).
 */
export function SideMenuOrderShipping({ className }: Props) {
  const contact = useStorefrontContact();
  const social = useStorefrontSocial();
  const [waOpen, setWaOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  const email = (contact.email || ORDER_SHIPPING_FALLBACK.email).trim();
  const phones = usableContacts(contact.contacts);

  const singleWhatsAppHref =
    social.whatsapp ||
    (phones[0]
      ? whatsAppHrefFromPhone(phones[0].phoneHref)
      : `https://wa.me/${ORDER_SHIPPING_FALLBACK.whatsappPhoneDigits}`);

  const multiWhatsApp = phones.length > 1;

  const closeWa = useCallback(() => setWaOpen(false), []);

  useEffect(() => {
    if (!waOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeWa();
    };
    const onPointerDown = (event: PointerEvent) => {
      if (pickerRef.current?.contains(event.target as Node)) return;
      closeWa();
    };

    document.addEventListener("keydown", onKeyDown);
    const timer = window.setTimeout(() => {
      document.addEventListener("pointerdown", onPointerDown);
    }, 0);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      window.clearTimeout(timer);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [waOpen, closeWa]);

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

      <div className="space-y-1.5 rounded-xl border border-primary/10 bg-card/80 px-2.5 py-2 text-[11px] leading-snug">
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
          <ul className="mt-0.5 space-y-0.5 text-muted-foreground">
            {ORDER_SHIPPING.regions.map((row) => (
              <li key={row.place}>
                <span className="text-foreground/90">{row.place}</span>
                {" — "}
                {row.time}
              </li>
            ))}
          </ul>
        </div>

        <p className="text-muted-foreground">{ORDER_SHIPPING.readyStock}</p>
        <p className="text-muted-foreground">{ORDER_SHIPPING.tracking}</p>
        <p className="text-muted-foreground">{ORDER_SHIPPING.wholesale}</p>
        <p className="font-medium text-foreground/90">
          {ORDER_SHIPPING.contactPrompt}
        </p>
      </div>

      <div className="flex items-end gap-3">
        <div
          className="relative flex flex-col items-center"
          ref={pickerRef}
        >
          {multiWhatsApp ? (
            <>
              <div
                id={listId}
                role="menu"
                aria-label="Choose WhatsApp contact"
                className={cn(
                  "absolute bottom-[calc(100%+0.4rem)] left-1/2 z-20 flex min-w-[10.5rem] -translate-x-1/2 flex-col gap-1.5 transition-all",
                  waOpen
                    ? "pointer-events-auto opacity-100"
                    : "pointer-events-none hidden opacity-0",
                )}
                aria-hidden={!waOpen}
              >
                {phones.map((person) => (
                  <a
                    key={person.phoneHref}
                    href={contactActionHref(person, "whatsapp")}
                    role="menuitem"
                    tabIndex={waOpen ? 0 : -1}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={closeWa}
                    className="rounded-xl border border-[#25D366]/30 bg-card px-3 py-2 shadow-md hover:bg-[#25D366]/[0.08]"
                  >
                    <span className="block truncate text-xs font-semibold text-foreground">
                      {person.name}
                    </span>
                    <span className="block truncate text-[11px] tabular-nums text-[#128C7E]">
                      {person.phone}
                    </span>
                  </a>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setWaOpen((open) => !open)}
                aria-expanded={waOpen}
                aria-controls={listId}
                aria-haspopup="menu"
                aria-label="WhatsApp — choose a contact"
                title={ORDER_SHIPPING.contactWhatsApp}
                className={cn(
                  iconBtn,
                  "border-[#25D366]/35 bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366]/18 focus-visible:ring-[#25D366]/40",
                  waOpen && "ring-2 ring-[#25D366]/40",
                )}
              >
                <Icons.whatsapp className="h-4 w-4" />
              </button>
            </>
          ) : (
            <a
              href={singleWhatsAppHref}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="WhatsApp us about your order"
              title={ORDER_SHIPPING.contactWhatsApp}
              className={cn(
                iconBtn,
                "border-[#25D366]/35 bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366]/18 focus-visible:ring-[#25D366]/40",
              )}
            >
              <Icons.whatsapp className="h-4 w-4" />
            </a>
          )}
          <span className="mt-1 text-[9px] font-medium text-muted-foreground">
            {ORDER_SHIPPING.contactWhatsApp}
          </span>
        </div>

        <div className="flex flex-col items-center">
          <a
            href={`mailto:${email}`}
            aria-label={`Email us at ${email}`}
            title={ORDER_SHIPPING.contactEmail}
            className={cn(
              iconBtn,
              "border-primary/25 bg-primary/10 text-primary hover:bg-primary/15 focus-visible:ring-primary/40",
            )}
          >
            <Mail className="h-4 w-4" strokeWidth={2} />
          </a>
          <span className="mt-1 text-[9px] font-medium text-muted-foreground">
            {ORDER_SHIPPING.contactEmail}
          </span>
        </div>

        <SheetClose asChild>
          <Link
            href={ORDER_SHIPPING.fullDetailsHref}
            className="mb-4 ml-auto text-[10px] font-semibold text-primary underline-offset-2 hover:underline"
          >
            {ORDER_SHIPPING.fullDetailsLabel}
          </Link>
        </SheetClose>
      </div>
    </section>
  );
}
