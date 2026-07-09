/** Build a WhatsApp chat URL from a `tel:` href or raw digits. */
export function whatsAppHrefFromPhone(phoneHref: string): string {
  const digits = phoneHref.replace(/^tel:/i, "").replace(/\D/g, "");
  return digits ? `https://wa.me/${digits}` : "https://wa.me/";
}

export type StoreContact = {
  name: string;
  phone: string;
  phoneHref: string;
};

export function contactActionHref(
  contact: StoreContact,
  mode: "call" | "whatsapp",
): string {
  return mode === "call"
    ? contact.phoneHref
    : whatsAppHrefFromPhone(contact.phoneHref);
}
