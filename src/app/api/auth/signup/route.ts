import { signupSchema } from "@/features/auth/validations";
import { publicErrorMessage } from "@/lib/api/public-error";
import {
  blockedSignupEmailMessage,
  isBlockedSignupEmail,
} from "@/lib/auth/email-policy";
import { checkAuthRateLimit, getRequestIp } from "@/lib/auth/rate-limit";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const ip = getRequestIp(request.headers);
  const { limited } = await checkAuthRateLimit(ip);
  if (limited) {
    return NextResponse.json(
      {
        message:
          "Too many sign-up attempts. Please wait a minute and try again.",
      },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { message: "Invalid request body." },
      { status: 400 },
    );
  }

  const parsed = signupSchema.safeParse(body);
  if (parsed.success === false) {
    const fieldErrors = parsed.error.flatten().fieldErrors;
    const message =
      fieldErrors.email?.[0] ??
      fieldErrors.password?.[0] ??
      fieldErrors.name?.[0] ??
      "Please check your sign-up details.";
    return NextResponse.json({ message }, { status: 400 });
  }

  const { email, password, name } = parsed.data;
  if (isBlockedSignupEmail(email)) {
    return NextResponse.json(
      { message: blockedSignupEmailMessage },
      { status: 400 },
    );
  }

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name },
  });

  if (error) {
    console.error("[auth/signup]", error.message);
    return NextResponse.json(
      {
        message: publicErrorMessage(
          error,
          "Could not create account. Please try again.",
        ),
      },
      { status: 400 },
    );
  }

  return NextResponse.json({
    ok: true,
    userId: data.user?.id ?? null,
  });
}
