import { publicErrorMessage } from "@/lib/api/public-error";
import { PromoteAdminSchema, promoteAdminSchema } from "@/features/users";
import { getSessionUser, isAdminUser } from "@/lib/auth/admin";
import createClient from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!(await isAdminUser(user))) {
    return NextResponse.json(
      { message: "Only admins can perform this action." },
      { status: 403 },
    );
  }

  const data: PromoteAdminSchema = await request.json();
  const validate = promoteAdminSchema.safeParse(data);

  if (!validate.success) {
    return NextResponse.json(
      { message: "Error, data validation failed." },
      { status: 400 },
    );
  }

  const cookieStore = cookies();
  const client = createClient({ cookieStore, isAdmin: true });

  const { data: userResponse } = await client.auth.admin.getUserById(
    validate.data.userId,
  );

  if (!userResponse.user) {
    return NextResponse.json({ message: "User not found." }, { status: 404 });
  }

  const { data: updatedUser, error } = await client.auth.admin.updateUserById(
    validate.data.userId,
    { app_metadata: { isAdmin: true } },
  );

  if (error) {
    console.error("[promote-user] update failed:", error);
    return NextResponse.json(
      {
        message: publicErrorMessage(
          error,
          "Could not promote user. Please try again.",
        ),
      },
      { status: 500 },
    );
  }

  return NextResponse.json(
    {
      message: `User:${updatedUser.user.user_metadata.name} is promoted to Admin.`,
    },
    { status: 201 },
  );
}
