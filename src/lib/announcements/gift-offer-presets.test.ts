import {
  FREE_GIFT_OFFER_PRESETS,
  buildFreeGiftOfferLines,
} from "./gift-offer-presets";

describe("free gift offer presets", () => {
  it("includes Tamil and English for each threshold", () => {
    expect(FREE_GIFT_OFFER_PRESETS).toHaveLength(10);
    const tamil = FREE_GIFT_OFFER_PRESETS.filter((line) =>
      /மேல் வாங்கினால்|மேல் வாங்கினால்|மேல்/.test(line.text),
    );
    const english = FREE_GIFT_OFFER_PRESETS.filter((line) =>
      line.text.startsWith("Buy above"),
    );
    expect(tamil).toHaveLength(5);
    expect(english).toHaveLength(5);
  });

  it("builds unique ids from a start index", () => {
    const lines = buildFreeGiftOfferLines(4);
    expect(lines[0]?.id).toBe("gift-offer-4");
    expect(lines[9]?.id).toBe("gift-offer-13");
    expect(new Set(lines.map((line) => line.id)).size).toBe(10);
  });

  it("keeps shop CTA and href on every line", () => {
    for (const line of FREE_GIFT_OFFER_PRESETS) {
      expect(line.href).toBe("/shop");
      expect(line.cta).toBe("Shop now");
      expect(line.text).toContain("FREE GIFT");
    }
  });
});
