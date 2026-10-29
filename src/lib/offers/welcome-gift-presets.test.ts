import {
  WELCOME_FREE_GIFT_MESSAGES,
  mergeWelcomeGiftPresets,
  parseWelcomeExtraMessages,
} from "./welcome-gift-presets";

describe("welcome gift presets", () => {
  it("has 5 Tamil and 5 English lines matching the shop list", () => {
    expect(WELCOME_FREE_GIFT_MESSAGES).toHaveLength(10);
    expect(
      WELCOME_FREE_GIFT_MESSAGES.filter((line) => /மேல்/.test(line)),
    ).toHaveLength(5);
    expect(
      WELCOME_FREE_GIFT_MESSAGES.filter((line) =>
        line.startsWith("Buy above"),
      ),
    ).toHaveLength(5);
    expect(WELCOME_FREE_GIFT_MESSAGES).toContain(
      "₹1999க்கு மேல் வாங்கினால் — ₹299 worth FREE GIFT 🎁",
    );
    expect(WELCOME_FREE_GIFT_MESSAGES).toContain(
      "₹1,999க்கு மேல் வாங்கினால் — ₹350 worth FREE GIFT 🎁",
    );
  });

  it("parses and trims message arrays", () => {
    expect(parseWelcomeExtraMessages(["  hello  ", "", 12])).toEqual([
      "hello",
      "12",
    ]);
    expect(parseWelcomeExtraMessages(null)).toEqual([]);
  });

  it("merges presets without duplicating", () => {
    const once = mergeWelcomeGiftPresets([]);
    expect(once).toHaveLength(10);
    expect(mergeWelcomeGiftPresets(once)).toEqual(once);
  });
});
