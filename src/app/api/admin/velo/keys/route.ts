import { publicValidationPayload } from "@/lib/api/public-error";
import { getSessionUser, isAdminUser } from "@/lib/auth/admin";
import {
  createVeloApiKey,
  listVeloApiKeys,
  revokeVeloApiKey,
} from "@/lib/integrations/velo";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const createSchema = z.object({
  clientName: z.string().trim().min(2).max(120),
});

const revokeSchema = z.object({
  id: z.string().trim().min(1),
});

async function ensureAdmin() {
  const user = await getSessionUser();
  const isAdmin = await isAdminUser(user);
  if (!user || !isAdmin) return null;
  return user;
}

export async function GET() {
  const user = await ensureAdmin();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const keys = await listVeloApiKeys();
  return NextResponse.json({ keys });
}

export async function POST(request: NextRequest) {
  const user = await ensureAdmin();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const payload = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(payload);
  if (!parsed.success) {
    const parseError = parsed as z.SafeParseError<z.infer<typeof createSchema>>;
    return NextResponse.json(
      publicValidationPayload("Invalid payload", parseError.error),
      { status: 400 },
    );
  }

  const created = await createVeloApiKey(parsed.data.clientName, user.id);
  return NextResponse.json({ created }, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const user = await ensureAdmin();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const payload = await request.json().catch(() => null);
  const parsed = revokeSchema.safeParse(payload);
  if (!parsed.success) {
    const parseError = parsed as z.SafeParseError<z.infer<typeof revokeSchema>>;
    return NextResponse.json(
      publicValidationPayload("Invalid payload", parseError.error),
      { status: 400 },
    );
  }

  await revokeVeloApiKey(parsed.data.id);
  return NextResponse.json({ ok: true });
}
