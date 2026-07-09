import { MobileMenuProvider } from "@/components/layouts/MobileMenuContext";
import Navbar from "@/components/layouts/MainNavbar";
import { getSessionUser, isAdminUser } from "@/lib/auth/admin";
import { ADMIN_POST_LOGIN_PATH, appendFromToSignIn } from "@/lib/auth/redirect";
import { redirect } from "next/navigation";
import { ReactNode } from "react";

type Props = { children: ReactNode };

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: Props) {
  const user = await getSessionUser();

  if (!(await isAdminUser(user))) {
    if (!user) {
      redirect(
        appendFromToSignIn("/sign-in", ADMIN_POST_LOGIN_PATH, {
          error: "Admin access required. Sign in with an admin account.",
        }),
      );
    }
    redirect("/?error=Admin access required. Sign in with an admin account.");
  }

  return (
    <MobileMenuProvider>
      <div className="flex h-dvh flex-col overflow-hidden bg-background">
        <Navbar adminLayout />
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {children}
        </div>
      </div>
    </MobileMenuProvider>
  );
}
