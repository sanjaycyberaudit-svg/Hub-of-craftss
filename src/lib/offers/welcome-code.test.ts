import type { OfferCodesConfig } from "@/lib/integrations/settings";
import { isWelcomeOfferCode, selectWelcomeOfferCode } from "./welcome-code";

const config = (
  enabled: boolean,
  codes: OfferCodesConfig["codes"],
): OfferCodesConfig => ({ enabled, codes });

describe("selectWelcomeOfferCode", () => {
  it("picks the first active code with a discount", () => {
    const result = selectWelcomeOfferCode(
      config(true, [
        { code: "OLD", percentage: 20, enabled: false },
        { code: "WELCOME10", percentage: 10, enabled: true },
        { code: "FEST5", percentage: 5, enabled: true },
      ]),
    );

    expect(result?.code).toBe("WELCOME10");
  });

  it("ignores zero-discount codes", () => {
    const result = selectWelcomeOfferCode(
      config(true, [
        { code: "EMPTY", percentage: 0, enabled: true },
        { code: "WELCOME10", percentage: 10, enabled: true },
      ]),
    );

    expect(result?.code).toBe("WELCOME10");
  });

  it("returns nothing when offer codes are switched off", () => {
    expect(
      selectWelcomeOfferCode(
        config(false, [{ code: "WELCOME10", percentage: 10, enabled: true }]),
      ),
    ).toBeNull();
  });
});

describe("isWelcomeOfferCode", () => {
  const active = config(true, [
    { code: "WELCOME10", percentage: 10, enabled: true },
    { code: "FEST5", percentage: 5, enabled: true },
  ]);

  it("matches the welcome code regardless of spacing or case", () => {
    expect(isWelcomeOfferCode(active, " welcome10 ")).toBe(true);
    expect(isWelcomeOfferCode(active, "WELCOME 10")).toBe(true);
  });

  it("does not restrict other offer codes", () => {
    expect(isWelcomeOfferCode(active, "FEST5")).toBe(false);
    expect(isWelcomeOfferCode(active, null)).toBe(false);
  });
});
