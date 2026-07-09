import dotenv from "dotenv";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import postgres from "postgres";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: join(root, ".env.local") });

const projectRef = process.env.NEXT_PUBLIC_SUPABASE_PROJECT_REF;
const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ??
  `https://${projectRef}.supabase.co`;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRole = process.env.DATABASE_SERVICE_ROLE;

const allowLiveEmailTest =
  process.argv.includes("--send-test-email") ||
  process.env.ALLOW_LIVE_AUTH_EMAIL_TEST === "true";

if (!anonKey || !projectRef) {
  console.error("Missing Supabase env in .env.local");
  process.exit(1);
}

const authBase = `${supabaseUrl.replace(/\/$/, "")}/auth/v1`;

async function fetchAuthSettings() {
  const res = await fetch(`${authBase}/settings`, {
    headers: { apikey: anonKey },
  });
  if (!res.ok) throw new Error(`settings ${res.status}: ${await res.text()}`);
  return res.json();
}

async function verifyDatabase() {
  const url = process.env.DATABASE_URL;
  if (!url) return { ok: false, error: "Missing DATABASE_URL" };

  const sql = postgres(url, { max: 1 });
  try {
    const [trigger] = await sql`
      SELECT tgname
      FROM pg_trigger t
      JOIN pg_class c ON c.oid = t.tgrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'auth'
        AND c.relname = 'users'
        AND tgname = 'on_auth_user_created'
        AND NOT t.tgisinternal
    `;
    const [fn] = await sql`
      SELECT proname FROM pg_proc
      WHERE proname = 'handle_new_user'
        AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    `;
    const [profiles] = await sql`
      SELECT count(*)::int AS count FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'profiles'
    `;
    return {
      ok: Boolean(trigger && fn && profiles?.count === 1),
      trigger: Boolean(trigger),
      handleNewUser: Boolean(fn),
      profilesTable: profiles?.count === 1,
    };
  } finally {
    await sql.end();
  }
}

async function testEmailSignup() {
  if (!allowLiveEmailTest) {
    return {
      ok: true,
      skipped: true,
      reason:
        "Skipped live signup email test (prevents Supabase bounces). Use --send-test-email only with a real inbox you control.",
    };
  }

  const testEmail = process.env.AUTH_TEST_EMAIL?.trim();
  if (!testEmail) {
    return {
      ok: false,
      error:
        "Set AUTH_TEST_EMAIL to a real inbox you control before using --send-test-email.",
    };
  }

  const password = "TestAuth!23456";

  const res = await fetch(`${authBase}/signup`, {
    method: "POST",
    headers: {
      apikey: anonKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: testEmail,
      password,
      data: { name: "Auth Verify" },
    }),
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = body.msg ?? body.error_description ?? JSON.stringify(body);
    if (String(msg).includes("rate limit")) {
      return { ok: true, skipped: true, reason: msg };
    }
    return { ok: false, status: res.status, error: msg };
  }

  const userId = body.user?.id;
  if (!userId) {
    return { ok: false, error: "No user id returned", body };
  }

  if (serviceRole) {
    await fetch(`${authBase}/admin/users/${userId}`, {
      method: "DELETE",
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${serviceRole}`,
      },
    });
  }

  return {
    ok: true,
    emailConfirmationRequired:
      body.user?.identities?.length === 0 || !body.session,
    userId,
    cleanedUp: Boolean(serviceRole),
  };
}

console.log("=== Supabase auth verification ===\n");

const settings = await fetchAuthSettings();
console.log("Auth settings:");
console.log("  external.email:", settings.external?.email ?? settings.DISABLE_SIGNUP === false);
console.log("  external.google:", settings.external?.google ?? false);
console.log("  disable_signup:", settings.disable_signup ?? settings.DISABLE_SIGNUP);
console.log("  mailer_autoconfirm:", settings.mailer_autoconfirm ?? settings.MAILER_AUTOCONFIRM);

const db = await verifyDatabase();
console.log("\nDatabase:");
console.log("  profiles trigger:", db.trigger ? "OK" : "MISSING");
console.log("  handle_new_user():", db.handleNewUser ? "OK" : "MISSING");
console.log("  profiles table:", db.profilesTable ? "OK" : "MISSING");

console.log("\nEmail signup test:");
const signup = await testEmailSignup();
if (signup.ok) {
  if (signup.skipped) {
    console.log("  SKIPPED —", signup.reason);
  } else {
    console.log("  OK — signup works");
    console.log(
      "  email confirm required:",
      signup.emailConfirmationRequired ? "yes" : "no",
    );
    if (signup.cleanedUp) console.log("  test user deleted");
  }
} else {
  console.log("  FAILED:", signup.error ?? signup);
}

const googleReady = Boolean(settings.external?.google);
console.log("\nSummary:");
console.log("  Email/password:", signup.ok ? "READY" : "NEEDS FIX");
console.log("  Google OAuth:", googleReady ? "ENABLED in Supabase" : "NOT ENABLED — needs Google Cloud + Supabase provider");

if (!googleReady) {
  console.log("\nGoogle redirect URI for Google Cloud Console:");
  console.log(`  ${supabaseUrl.replace(/\/$/, "")}/auth/v1/callback`);
  console.log("\nApp callback URLs for Supabase → Authentication → URL Configuration:");
  console.log("  http://localhost:3000/auth/callback");
  console.log("  https://ssr-tex-shop.vercel.app/auth/callback");
}

process.exit(signup.ok && db.ok ? 0 : 1);
