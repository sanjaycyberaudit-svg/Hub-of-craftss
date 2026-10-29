/**
 * One-off: set Welcome Offer popup gift messages (Tamil + English) on offer_codes.
 * Usage: node --env-file=.env.local scripts/apply-welcome-gift-messages.mjs
 */
import postgres from "postgres";

const MESSAGES = [
  "₹499க்கு மேல் வாங்கினால் — ₹89 worth FREE GIFT 🎁",
  "Buy above ₹499 — get a FREE GIFT worth ₹89 🎁",
  "₹999 மேல் வாங்கினால் — ₹150 worth FREE GIFT 🎁",
  "Buy above ₹999 — get a FREE GIFT worth ₹150 🎁",
  "₹1999க்கு மேல் வாங்கினால் — ₹299 worth FREE GIFT 🎁",
  "Buy above ₹1999 — get a FREE GIFT worth ₹299 🎁",
  "₹1,999க்கு மேல் வாங்கினால் — ₹350 worth FREE GIFT 🎁",
  "Buy above ₹1,999 — get a FREE GIFT worth ₹350 🎁",
  "₹4,999க்கு மேல் வாங்கினால் — ₹500 worth FREE GIFT 🎁",
  "Buy above ₹4,999 — get a FREE GIFT worth ₹500 🎁",
];

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("Missing DATABASE_URL");
  process.exit(1);
}

const sql = postgres(url, { max: 1, prepare: false, connect_timeout: 15 });

try {
  const rows = await sql`
    select key, value, is_enabled
    from api_settings
    where key = 'offer_codes'
  `;
  const row = rows[0];
  if (!row) throw new Error("offer_codes setting not found");

  const value =
    typeof row.value === "string"
      ? JSON.parse(row.value)
      : { ...(row.value ?? {}) };
  const welcomeOffer = {
    ...(value.welcomeOffer && typeof value.welcomeOffer === "object"
      ? value.welcomeOffer
      : {}),
    extraMessages: MESSAGES,
  };
  const nextValue = { ...value, welcomeOffer };

  await sql`
    update api_settings
    set value = ${sql.json(nextValue)},
        updated_at = now()
    where key = 'offer_codes'
  `;

  console.log(
    JSON.stringify(
      {
        ok: true,
        enabled: welcomeOffer.enabled ?? null,
        code: welcomeOffer.code ?? null,
        percentage: welcomeOffer.percentage ?? null,
        extraMessages: welcomeOffer.extraMessages.length,
        tamil: welcomeOffer.extraMessages.filter((line) => /மேல்/.test(line)),
      },
      null,
      2,
    ),
  );
} finally {
  await sql.end({ timeout: 5 });
}
