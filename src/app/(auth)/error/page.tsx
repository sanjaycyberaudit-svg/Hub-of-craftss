import { redirect } from "next/navigation";
import Link from "next/link";
import {
  ADMIN_POST_LOGIN_PATH,
  getRedirectFromSearchParams,
} from "@/lib/auth/redirect";
import { getSessionUser, isAdminUser } from "@/lib/auth/admin";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

type ErrorPageProps = {
  searchParams?: {
    from?: string;
    next?: string;
    redirect?: string;
  };
};

export default async function ErrorPage({ searchParams }: ErrorPageProps) {
  const user = await getSessionUser();

  if (user) {
    const params = new URLSearchParams();
    for (const key of ["from", "next", "redirect"] as const) {
      const value = searchParams?.[key];
      if (value) params.set(key, value);
    }

    const requested = getRedirectFromSearchParams(params, "");
    if (requested) {
      redirect(requested);
    }

    if (await isAdminUser(user)) {
      redirect(ADMIN_POST_LOGIN_PATH);
    }

    redirect("/");
  }

  return (
    <section className="mx-auto max-w-md space-y-4 rounded-xl border bg-card p-6 text-center shadow-sm">
      <h1 className="text-xl font-semibold">Sorry, something went wrong</h1>
      <p className="text-sm text-muted-foreground">
        We could not finish signing you in. Please try again.
      </p>
      <Button asChild className="w-full bg-primary hover:bg-[#55104A]">
        <Link href="/sign-in">Back to sign in</Link>
      </Button>
    </section>
  );
}
