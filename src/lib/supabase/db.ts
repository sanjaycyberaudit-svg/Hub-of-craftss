import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "@/env.mjs";
import * as schema from "./schema";
import { resolveDatabaseUrl } from "./resolve-database-url";

const connectionString = resolveDatabaseUrl(env.DATABASE_URL);

if (!connectionString) {
  console.log("🔴 no database URL");
}

function isCloudflareWorkerRuntime() {
  return (
    typeof navigator !== "undefined" &&
    typeof navigator.userAgent === "string" &&
    navigator.userAgent.includes("Cloudflare-Workers")
  );
}

/** Serverless / Workers: tiny pool + short lifetime to avoid stale-socket hangs (Error 1101). */
const client = postgres(connectionString, {
  prepare: false,
  max: 1,
  idle_timeout: isCloudflareWorkerRuntime() ? 1 : 20,
  connect_timeout: 8,
  max_lifetime: isCloudflareWorkerRuntime() ? 20 : 60 * 5,
  connection: {
    statement_timeout: 8000,
  },
});

const db = drizzle(client, { schema });

export default db;
