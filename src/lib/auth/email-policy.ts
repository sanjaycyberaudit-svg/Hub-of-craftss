/** Block disposable / test inboxes that cause Supabase email bounces. */
const DISPOSABLE_DOMAINS = new Set([
  "yopmail.com",
  "yopmail.fr",
  "yopmail.net",
  "mailinator.com",
  "guerrillamail.com",
  "guerrillamail.net",
  "guerrillamail.org",
  "guerrillamail.biz",
  "guerrillamail.de",
  "sharklasers.com",
  "grr.la",
  "10minutemail.com",
  "10minutemail.net",
  "tempmail.com",
  "temp-mail.org",
  "throwaway.email",
  "fakeinbox.com",
  "trashmail.com",
  "getnada.com",
  "dispostable.com",
  "maildrop.cc",
  "example.com",
  "example.org",
  "test.com",
  "localhost.com",
]);

const TEST_EMAIL_PREFIXES = ["ssrtex.verify.", "auth.verify."];

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function isBlockedSignupEmail(email: string): boolean {
  const normalized = normalizeEmail(email);
  const at = normalized.lastIndexOf("@");
  if (at < 1) return true;

  const local = normalized.slice(0, at);
  const domain = normalized.slice(at + 1);

  if (DISPOSABLE_DOMAINS.has(domain)) return true;
  if (TEST_EMAIL_PREFIXES.some((prefix) => local.startsWith(prefix)))
    return true;

  return false;
}

export const blockedSignupEmailMessage =
  "Please use a real email address you can access. Temporary or test addresses are not allowed.";
