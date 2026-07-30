import type { OfferCodesConfig } from "@/lib/integrations/settings";
import {
  isWelcomeOfferCode,
  selectActiveOfferCodes,
  selectWelcomeOfferCode,
} from "./welcome-code";

const config = (
  enabled: boolean,
  welcomeOffer: OfferCodesConfig["welcomeOffer"],
  codes: OfferCodesConfig["codes"],
): OfferCodesConfig => ({ enabled, welcomeOffer, codes });

describe("selectWelcomeOfferCode", () => {
  it("returns the dedicated popup offer, not the first common code", () => {
    const result = selectWelcomeOfferCode(
      config(true, { code: "WELCOME10", percentage: 10, enabled: true }, [
        { code: "FEST5", percentage: 5, enabled: true },
      ]),
    );

    expect(result?.code).toBe("WELCOME10");
  });

  it("returns nothing when the popup is switched off", () => {
    expect(
      selectWelcomeOfferCode(
        config(true, { code: "WELCOME10", percentage: 10, enabled: false }, [
          { code: "FEST5", percentage: 5, enabled: true },
        ]),
      ),
    ).toBeNull();
  });

  it("is independent from the common offer toggle", () => {
    expect(
      selectWelcomeOfferCode(
        config(false, { code: "WELCOME10", percentage: 10, enabled: true }, []),
      )?.code,
    ).toBe("WELCOME10");
  });
});

describe("isWelcomeOfferCode", () => {
  const active = config(
    true,
    { code: "WELCOME10", percentage: 10, enabled: true },
    [{ code: "FEST5", percentage: 5, enabled: true }],
  );

  it("matches the welcome code regardless of spacing or case", () => {
    expect(isWelcomeOfferCode(active, " welcome10 ")).toBe(true);
    expect(isWelcomeOfferCode(active, "WELCOME 10")).toBe(true);
  });

  it("does not restrict other offer codes", () => {
    expect(isWelcomeOfferCode(active, "FEST5")).toBe(false);
    expect(isWelcomeOfferCode(active, null)).toBe(false);
  });
});

describe("selectActiveOfferCodes", () => {
  it("keeps the popup active when common offers are disabled", () => {
    const active = selectActiveOfferCodes(
      config(false, { code: "WELCOME10", percentage: 10, enabled: true }, [
        { code: "FEST5", percentage: 5, enabled: true },
      ]),
    );

    expect(active.map((item) => item.code)).toEqual(["WELCOME10"]);
  });

  it("keeps common offers active when the popup is disabled", () => {
    const active = selectActiveOfferCodes(
      config(true, { code: "WELCOME10", percentage: 10, enabled: false }, [
        { code: "FEST5", percentage: 5, enabled: true },
      ]),
    );

    expect(active.map((item) => item.code)).toEqual(["FEST5"]);
  });
});
