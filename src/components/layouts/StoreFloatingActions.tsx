"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Mail, PhoneCall, ShoppingBag } from "lucide-react";
import { Icons } from "@/components/layouts/icons";
import { useCartCount } from "@/features/carts/hooks/useCartCount";
import { shopMailtoHref } from "@/lib/contact/links";
import { cn } from "@/lib/utils";
import { useStorefrontContact } from "@/providers/ShopContactProvider";
import { useMobileMenu } from "./MobileMenuContext";
import { useCheckoutChrome } from "@/providers/CheckoutChromeProvider";
import {
  FloatingContactPicker,
  type ContactPickerMode,
} from "./FloatingContactPicker";

function CartBadge({ count }: { count: number }) {
  if (count <= 0) return null;

  return (
    <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white shadow-sm">
      {count > 9 ? "9+" : count}
    </span>
  );
}

const floatingActionButtonClass =
  "flex h-12 w-12 shrink-0 items-center justify-center rounded-full transition-transform hover:scale-105 active:scale-95 touch-manipulation";

/** Mobile routes with their own fixed bottom dock that the stack would cover. */
const MOBILE_HIDDEN_PATHS = new Set(["/cart"]);

const NON_TEXT_INPUT_TYPES = new Set([
  "button",
  "checkbox",
  "color",
  "file",
  "hidden",
  "image",
  "radio",
  "range",
  "reset",
  "submit",
]);

function isTextEntryElement(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable || target instanceof HTMLTextAreaElement) {
    return true;
  }
  return (
    target instanceof HTMLInputElement && !NON_TEXT_INPUT_TYPES.has(target.type)
  );
}

/** True while a text field has focus (on phones the keyboard is open). */
function useTextEntryFocused(): boolean {
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    const onFocusIn = (event: FocusEvent) =>
      setFocused(isTextEntryElement(event.target));
    const onFocusOut = (event: FocusEvent) => {
      if (!isTextEntryElement(event.relatedTarget)) setFocused(false);
    };
    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", onFocusOut);
    return () => {
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("focusout", onFocusOut);
    };
  }, []);

  return focused;
}

export function StoreFloatingActions() {
  const { isOpen: menuOpen } = useMobileMenu();
  const { hideStoreChrome } = useCheckoutChrome();
  const cartCount = useCartCount();
  const contact = useStorefrontContact();
  const mailHref = shopMailtoHref(contact.email);
  const [openPicker, setOpenPicker] = useState<ContactPickerMode | null>(null);
  const pathname = usePathname();
  const textEntryFocused = useTextEntryFocused();
  const hideOnMobile =
    textEntryFocused || MOBILE_HIDDEN_PATHS.has(pathname ?? "");

  const handlePickerChange = useCallback(
    (mode: ContactPickerMode, open: boolean) => {
      setOpenPicker(open ? mode : null);
    },
    [],
  );

  if (menuOpen || hideStoreChrome) return null;

  return (
    <>
      {openPicker ? (
        <div
          className="fixed inset-0 z-[225] bg-black/10 backdrop-blur-[1px] md:pointer-events-none md:bg-transparent md:backdrop-blur-none"
          aria-hidden
          onClick={() => setOpenPicker(null)}
        />
      ) : null}

      <div
        className={cn(
          "fixed right-4 z-[230] flex-col items-end gap-3 bottom-[calc(var(--mobile-nav-height)+1rem)] md:bottom-6 md:flex",
          hideOnMobile ? "hidden" : "flex",
        )}
        data-mobile-hidden={hideOnMobile ? "true" : undefined}
        aria-label="Quick actions"
      >
        <FloatingContactPicker
          mode="call"
          isOpen={openPicker === "call"}
          onOpenChange={(open) => handlePickerChange("call", open)}
          triggerLabel="Call Hub of craftss — choose a number"
          triggerClassName={`animate-phone-glow ${floatingActionButtonClass} bg-primary text-white ring-2 ring-primary/40`}
          triggerIcon={<PhoneCall className="h-5 w-5" strokeWidth={2} />}
        />

        <Link
          href="/cart"
          className={`relative ${floatingActionButtonClass} border border-border bg-card text-foreground shadow-[0_4px_16px_rgba(192,48,120,0.12)]`}
          aria-label={`Cart${cartCount > 0 ? `, ${cartCount} items` : ""}`}
        >
          <ShoppingBag className="h-5 w-5" strokeWidth={1.75} />
          <CartBadge count={cartCount} />
        </Link>

        {mailHref ? (
          <a
            href={mailHref}
            className={`${floatingActionButtonClass} border border-border bg-card text-foreground shadow-[0_4px_16px_rgba(192,48,120,0.12)]`}
            aria-label={`Email Hub of craftss at ${contact.email}`}
          >
            <Mail className="h-5 w-5" strokeWidth={1.75} />
          </a>
        ) : null}

        <FloatingContactPicker
          mode="whatsapp"
          isOpen={openPicker === "whatsapp"}
          onOpenChange={(open) => handlePickerChange("whatsapp", open)}
          triggerLabel="Chat on WhatsApp — choose a contact"
          triggerClassName={`animate-whatsapp-glow ${floatingActionButtonClass} bg-[#25D366] text-white ring-2 ring-[#25D366]/40`}
          triggerIcon={<Icons.whatsapp className="h-5 w-5" />}
        />
      </div>
    </>
  );
}
