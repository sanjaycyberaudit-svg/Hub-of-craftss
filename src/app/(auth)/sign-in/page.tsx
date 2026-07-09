import { type Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { AuthOrDivider } from "@/features/auth/components/AuthOrDivider";
import OAuthLoginButtons from "@/features/auth/components/OAuthLoginButtons";
import { SigninForm } from "@/features/auth";
import { getRedirectFromSearchParams } from "@/lib/auth/redirect";
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

export const metadata: Metadata = {
  title: "Sign In | SRI SAI RAGHAVENDRA TEX",
  description: "Sign in to your SRI SAI RAGHAVENDRA TEX account",
};

type SignInPageProps = {
  searchParams?: Promise<{ from?: string; next?: string; redirect?: string }>;
};

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const cookieStore = await cookies();
  const supabase = createClient({ cookieStore });
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const params = new URLSearchParams();
    for (const key of ["from", "next", "redirect"] as const) {
      const value = resolvedSearchParams?.[key];
      if (value) params.set(key, value);
    }
    const requested = getRedirectFromSearchParams(params, "");
    if (requested) {
      redirect(requested);
    }
    redirect("/orders");
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col items-center gap-3 text-center sm:items-start sm:text-left">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Sign in
          </h1>
          <p className="text-sm text-muted-foreground">
            Welcome back to SRI SAI RAGHAVENDRA TEX
          </p>
        </div>
      </div>

      <Suspense
        fallback={
          <div className="h-[7.5rem] w-full animate-pulse rounded-xl bg-muted" />
        }
      >
        <OAuthLoginButtons />
      </Suspense>

      <AuthOrDivider />

      <Suspense
        fallback={
          <div className="h-48 w-full animate-pulse rounded-lg bg-muted" />
        }
      >
        <SigninForm />
      </Suspense>

      <div className="flex flex-col gap-3 border-t border-primary/10 pt-4 text-sm">
        <p className="text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link
            href="/sign-up"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Create account
          </Link>
        </p>
        <Link
          href="/"
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          ← Continue shopping
        </Link>
      </div>
    </section>
  );
}
