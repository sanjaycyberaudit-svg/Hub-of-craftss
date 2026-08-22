import { getSessionUser, isAdminUser } from "@/lib/auth/admin";
import {
  logServerError,
  publicValidationPayload,
} from "@/lib/api/public-error";
import {
  courierNameToIdBase,
  parseCreateDispatchCourierPayload,
} from "@/lib/dispatch/courier-form";
import db from "@/lib/supabase/db";
import { dispatchCouriers } from "@/lib/supabase/schema";
import { asc, eq, sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

async function ensureAdmin() {
  const user = await getSessionUser();
  return user && (await isAdminUser(user)) ? user : null;
}

export async function GET() {
  if (!(await ensureAdmin())) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  const couriers = await db
    .select({
      id: dispatchCouriers.id,
      name: dispatchCouriers.name,
      trackingUrlTemplate: dispatchCouriers.trackingUrlTemplate,
    })
    .from(dispatchCouriers)
    .where(eq(dispatchCouriers.isActive, true))
    .orderBy(asc(dispatchCouriers.name));
  return NextResponse.json({ couriers });
}

export async function POST(request: NextRequest) {
  if (!(await ensureAdmin())) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  const parsed = parseCreateDispatchCourierPayload(
    await request.json().catch(() => null),
  );
  if (parsed.success === false) {
    return NextResponse.json(
      publicValidationPayload("Invalid courier payload", parsed.error),
      { status: 400 },
    );
  }
  const { name, trackingUrlTemplate } = parsed.data;
  const [existing] = await db
    .select()
    .from(dispatchCouriers)
    .where(sql`lower(trim(${dispatchCouriers.name})) = lower(trim(${name}))`)
    .limit(1);
  if (existing?.isActive) {
    return NextResponse.json(
      { message: `Courier "${existing.name}" already exists.` },
      { status: 409 },
    );
  }
  try {
    if (existing) {
      const [courier] = await db
        .update(dispatchCouriers)
        .set({
          isActive: true,
          trackingUrlTemplate:
            trackingUrlTemplate ?? existing.trackingUrlTemplate,
        })
        .where(eq(dispatchCouriers.id, existing.id))
        .returning();
      return NextResponse.json({
        courier,
        created: false,
        reactivated: true,
      });
    }
    const base = courierNameToIdBase(name);
    let id = base;
    for (let suffix = 2; ; suffix += 1) {
      const [match] = await db
        .select({ id: dispatchCouriers.id })
        .from(dispatchCouriers)
        .where(eq(dispatchCouriers.id, id))
        .limit(1);
      if (!match) break;
      id = `${base}${suffix}`;
    }
    const [courier] = await db
      .insert(dispatchCouriers)
      .values({ id, name, trackingUrlTemplate, isActive: true })
      .returning();
    return NextResponse.json({
      courier,
      created: true,
      reactivated: false,
    });
  } catch (error) {
    logServerError("admin/dispatch-couriers POST", error);
    return NextResponse.json(
      { message: "Could not save courier. Please retry." },
      { status: 500 },
    );
  }
}
