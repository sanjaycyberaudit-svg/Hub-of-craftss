"use server";

import { requireAdminActionUser } from "@/lib/auth/require-admin";
import db from "@/lib/supabase/db";
import { medias } from "@/lib/supabase/schema";
import { eq } from "drizzle-orm";

export async function getMedia(id: string) {
  await requireAdminActionUser();
  return await db.query.medias.findFirst({ where: eq(medias.id, id) });
}
