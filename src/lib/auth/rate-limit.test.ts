import { checkAuthRateLimit, checkCheckoutRateLimit } from "./rate-limit";

// No UPSTASH_* env in Jest, so these tests exercise the in-memory fallback
// that now protects auth/checkout when Redis is down (previously fail-open).
describe("rate limit in-memory fallback", () => {
  beforeEach(() => {
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
  });

  it("limits after the configured number of attempts", async () => {
    const ip = `10.0.0.${Math.floor(Math.random() * 254)}-auth`;

    for (let i = 0; i < 3; i += 1) {
      const result = await checkAuthRateLimit(ip, { limit: 3, windowSec: 60 });
      expect(result.limited).toBe(false);
    }

    const blocked = await checkAuthRateLimit(ip, { limit: 3, windowSec: 60 });
    expect(blocked.limited).toBe(true);
    expect(blocked.remaining).toBe(0);
  });

  it("tracks checkout and auth keys independently", async () => {
    const ip = `10.0.1.${Math.floor(Math.random() * 254)}-mixed`;

    for (let i = 0; i < 2; i += 1) {
      await checkAuthRateLimit(ip, { limit: 2, windowSec: 60 });
    }
    const authBlocked = await checkAuthRateLimit(ip, {
      limit: 2,
      windowSec: 60,
    });
    expect(authBlocked.limited).toBe(true);

    const checkoutOk = await checkCheckoutRateLimit(ip, {
      limit: 2,
      windowSec: 60,
    });
    expect(checkoutOk.limited).toBe(false);
  });

  it("resets after the window expires", async () => {
    jest.useFakeTimers();
    try {
      const ip = `10.0.2.${Math.floor(Math.random() * 254)}-window`;

      await checkAuthRateLimit(ip, { limit: 1, windowSec: 60 });
      const blocked = await checkAuthRateLimit(ip, { limit: 1, windowSec: 60 });
      expect(blocked.limited).toBe(true);

      jest.advanceTimersByTime(61_000);

      const allowedAgain = await checkAuthRateLimit(ip, {
        limit: 1,
        windowSec: 60,
      });
      expect(allowedAgain.limited).toBe(false);
    } finally {
      jest.useRealTimers();
    }
  });
});
