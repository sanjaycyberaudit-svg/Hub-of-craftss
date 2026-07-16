import { buildCanonicalRedirectUrl } from "./canonical-host-redirect";

const CANONICAL = "https://hubsofcraftss.com";

describe("buildCanonicalRedirectUrl", () => {
  it("redirects workers.dev to the custom domain", () => {
    expect(
      buildCanonicalRedirectUrl(
        "https://hub-of-craftss.shaarunew01.workers.dev/shop",
        "hub-of-craftss.shaarunew01.workers.dev",
        CANONICAL,
      ),
    ).toBe("https://hubsofcraftss.com/shop");
  });

  it("redirects legacy workers.dev subdomains", () => {
    expect(
      buildCanonicalRedirectUrl(
        "https://hub-of-craftss.hubofcraftss.workers.dev/admin",
        "hub-of-craftss.hubofcraftss.workers.dev",
        CANONICAL,
      ),
    ).toBe("https://hubsofcraftss.com/admin");
  });

  it("preserves query strings through redirect", () => {
    expect(
      buildCanonicalRedirectUrl(
        "https://hub-of-craftss.shaarunew01.workers.dev/?code=abc123",
        "hub-of-craftss.shaarunew01.workers.dev",
        CANONICAL,
      ),
    ).toBe("https://hubsofcraftss.com/?code=abc123");
  });

  it("does not redirect the canonical apex host", () => {
    expect(
      buildCanonicalRedirectUrl(
        "https://hubsofcraftss.com/shop",
        "hubsofcraftss.com",
        CANONICAL,
      ),
    ).toBeNull();
  });

  it("does not redirect the canonical www host", () => {
    expect(
      buildCanonicalRedirectUrl(
        "https://www.hubsofcraftss.com/shop",
        "www.hubsofcraftss.com",
        CANONICAL,
      ),
    ).toBeNull();
  });

  it("does not redirect localhost", () => {
    expect(
      buildCanonicalRedirectUrl(
        "http://localhost:3000/shop",
        "localhost",
        CANONICAL,
      ),
    ).toBeNull();
  });

  it("does not redirect when canonical is still workers.dev", () => {
    expect(
      buildCanonicalRedirectUrl(
        "https://hub-of-craftss.shaarunew01.workers.dev/",
        "hub-of-craftss.shaarunew01.workers.dev",
        "https://hub-of-craftss.shaarunew01.workers.dev",
      ),
    ).toBeNull();
  });
});
