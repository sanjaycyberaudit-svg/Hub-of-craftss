import postgres from "postgres";
import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import {
  resolveDatabaseUrl,
  describeDatabaseUrl,
  TRANSACTION_POOLER_PORT,
  SESSION_POOLER_PORT,
} from "../src/lib/supabase/resolve-database-url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
config({ path: resolve(root, ".env.local") });

async function main() {
  const legacy =
    "postgresql://postgres:xxx@db.xytdexahcdyhykvuwpys.supabase.co:5432/postgres";
  const rewritten = resolveDatabaseUrl(legacy);
  const legacyHost = new URL(rewritten.replace(/^postgresql:/i, "http:")).host;
  console.log("legacy rewrite host:", legacyHost);
  console.log(
    "legacy uses transaction port:",
    legacyHost.includes(`:${TRANSACTION_POOLER_PORT}`),
  );

  const sessionSample =
    "postgresql://postgres.xytdexahcdyhykvuwpys:xxx@aws-1-ap-south-1.pooler.supabase.com:5432/postgres";
  const normalizedSession = resolveDatabaseUrl(sessionSample);
  const sessionHost = new URL(
    normalizedSession.replace(/^postgresql:/i, "http:"),
  ).host;
  console.log("session→transaction host:", sessionHost);
  console.log(
    "session rewrite ok:",
    sessionHost.endsWith(`:${TRANSACTION_POOLER_PORT}`),
  );

  const url = resolveDatabaseUrl(process.env.DATABASE_URL);
  const info = describeDatabaseUrl(process.env.DATABASE_URL);
  console.log("live resolved:", {
    host: info.host,
    port: info.port,
    pooler: info.pooler,
    rewrites: info.rewrites,
    expectedPort: String(TRANSACTION_POOLER_PORT),
    notSessionPort: info.port !== String(SESSION_POOLER_PORT),
  });

  if (!info.pooler || info.port !== String(TRANSACTION_POOLER_PORT)) {
    throw new Error(
      `Expected transaction pooler :${TRANSACTION_POOLER_PORT}, got ${info.host}`,
    );
  }

  const sql = postgres(url, { prepare: false, max: 1, connect_timeout: 15 });
  try {
    const [row] = await sql`select 1 as ok`;
    console.log("connected:", row);
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
