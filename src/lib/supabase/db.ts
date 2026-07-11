import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { cache } from "react";
import { AsyncLocalStorage } from "node:async_hooks";
import { env } from "@/env.mjs";
import * as schema from "./schema";
import { resolveDatabaseUrl } from "./resolve-database-url";

const connectionString = resolveDatabaseUrl(env.DATABASE_URL);

if (!connectionString) {
  console.log("🔴 no database URL");
}

export type AppDatabase = PostgresJsDatabase<typeof schema>;

/**
 * Cloudflare Workers forbid reusing TCP/DB I/O across requests.
 * A module-global postgres client causes hung admin APIs (integrations, medias, orders).
 * Create one client per request and cache it for that request only.
 */
function createDb(): AppDatabase {
  const client = postgres(connectionString, {
    prepare: false,
    // Parallel queries are OK within one request; never reuse this client across requests.
    max: 5,
    idle_timeout: 5,
    connect_timeout: 8,
    max_lifetime: 30,
    connection: {
      statement_timeout: 8000,
    },
  });
  return drizzle(client, { schema });
}

const requestDb = new AsyncLocalStorage<AppDatabase>();

/** RSC fallback: one client per React request when ALS is not set. */
const getDbForReactRequest = cache(() => createDb());

/** Prefer this in new code. ALS (route handlers) wins over react.cache (RSC). */
export function getDb(): AppDatabase {
  return requestDb.getStore() ?? getDbForReactRequest();
}

/**
 * Run work with a request-scoped DB (route handlers that touch DB many times).
 * Safe no-op nesting if already inside a scope.
 */
export function withDb<T>(fn: () => T): T {
  if (requestDb.getStore()) return fn();
  return requestDb.run(createDb(), fn);
}

export async function withDbAsync<T>(fn: () => Promise<T>): Promise<T> {
  if (requestDb.getStore()) return fn();
  return requestDb.run(createDb(), fn);
}

/**
 * Backward-compatible default: every property access uses a per-request client,
 * never a process-global connection.
 */
const db = new Proxy({} as AppDatabase, {
  get(_target, prop, receiver) {
    const instance = getDb();
    const value = Reflect.get(instance as object, prop, receiver);
    return typeof value === "function"
      ? (value as (...args: unknown[]) => unknown).bind(instance)
      : value;
  },
}) as AppDatabase;

export default db;
