import { NextRequest, NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import db from "@/lib/supabase/db";
import { isRedisCacheEnabled, redisGet } from "@/lib/cache/redis";

export const dynamic = "force-dynamic";

const CHECK_TIMEOUT_MS = 3000;

function withTimeout<T>(promise: Promise<T>, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error(`${label} check timed out`)),
        CHECK_TIMEOUT_MS,
      ),
    ),
  ]);
}

function shallowResponse() {
  return NextResponse.json(
    {
      status: "ok",
      mode: "shallow",
      timestamp: new Date().toISOString(),
      service: "hub-of-craftss",
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}

/**
 * Health check for uptime monitors and keep-warm pings.
 *
 * Default (`GET /api/health`) is shallow — no database — so monitors and
 * edge keep-warm do not burn Fluid CPU or Supabase pool slots.
 *
 * Deep check (`GET /api/health?deep=1`) verifies database + Redis and returns
 * 503 when the database is unreachable (use for alerting, not 5-minute polls).
 */
export async function GET(request: NextRequest) {
  if (request.nextUrl.searchParams.get("deep") !== "1") {
    return shallowResponse();
  }

  const checkedAt = new Date().toISOString();

  const [database, redis] = await Promise.all([
    withTimeout(db.execute(sql`select 1`), "database").then(
      () => "ok" as const,
      (error) => {
        console.error("[health] database check failed:", error);
        return "error" as const;
      },
    ),
    !isRedisCacheEnabled()
      ? Promise.resolve("disabled" as const)
      : withTimeout(redisGet("health:probe"), "redis").then(
          () => "ok" as const,
          () => "error" as const,
        ),
  ]);

  const healthy = database === "ok";

  return NextResponse.json(
    {
      status: healthy ? "ok" : "degraded",
      mode: "deep",
      timestamp: checkedAt,
      service: "hub-of-craftss",
      checks: { database, redis },
    },
    {
      status: healthy ? 200 : 503,
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
