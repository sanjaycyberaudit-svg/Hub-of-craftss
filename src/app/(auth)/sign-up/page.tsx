import { type Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { AuthOrDivider } from "@/features/auth/components/AuthOrDivider";
import OAuthLoginButtons from "@/features/auth/components/OAuthLoginButtons";
import { SignupForm } from "@/features/auth";
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

export const metadata: Metadata = {
  title: "Sign Up | SRI SAI RAGHAVENDRA TEX",
  description: "Create your SRI SAI RAGHAVENDRA TEX account",
};

export default async function SignUpPage() {
  const supabase = createClient({ cookieStore: cookies() });
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/");
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col items-center gap-3 text-center sm:items-start sm:text-left">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Create account
          </h1>
          <p className="text-sm text-muted-foreground">
            Join SRI SAI RAGHAVENDRA TEX for orders and wishlist
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
        <SignupForm />
      </Suspense>

      <div className="flex flex-col gap-3 border-t border-primary/10 pt-4 text-sm">
        <p className="text-muted-foreground">
          Already have an account?{" "}
          <Link
            href="/sign-in"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Sign in
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
