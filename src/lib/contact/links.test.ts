import { contactActionHref, whatsAppHrefFromPhone } from "@/lib/contact/links";

describe("contact links", () => {
  it("builds WhatsApp href from tel link", () => {
    expect(whatsAppHrefFromPhone("tel:+918012715132")).toBe(
      "https://wa.me/918012715132",
    );
  });

  it("returns call or WhatsApp href by mode", () => {
    const contact = {
      name: "J. Moulee",
      phone: "+91 80127 15132",
      phoneHref: "tel:+918012715132",
    };

    expect(contactActionHref(contact, "call")).toBe("tel:+918012715132");
    expect(contactActionHref(contact, "whatsapp")).toBe(
      "https://wa.me/918012715132",
    );
  });
});
