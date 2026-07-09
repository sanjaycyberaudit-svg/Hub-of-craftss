"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { buildOAuthCallbackUrl } from "@/lib/auth/callback";
import { getRedirectFromSearchParams } from "@/lib/auth/redirect";
import { getCanonicalSiteOrigin } from "@/lib/auth/site-urls";

import { Icons } from "@/components/layouts/icons";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

function OAuthLoginButtons() {
  const [isLoading, setIsLoading] = useState(false);
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();

  const signWithGoogle = async () => {
    setIsLoading(true);

    const next = getRedirectFromSearchParams(searchParams);
    const origin =
      process.env.NODE_ENV === "development"
        ? window.location.origin
        : getCanonicalSiteOrigin();
    const redirectTo = buildOAuthCallbackUrl(origin, next);

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
        skipBrowserRedirect: false,
      },
    });

    if (error) {
      router.push("/sign-in?error=Google+sign-in+failed");
      setIsLoading(false);
      return;
    }

    if (data?.url) {
      window.location.assign(data.url);
      return;
    }

    setIsLoading(false);
  };

  return (
    <div
      className={cn(
        "rounded-xl border border-primary/25 bg-primary/[0.05] p-4",
        "shadow-[inset_0_1px_0_0_rgba(255,255,255,0.6)]",
      )}
    >
      <Button
        type="button"
        variant="outline"
        className={cn(
          "h-11 w-full border-border/80 bg-background font-medium shadow-sm",
          "transition-colors hover:border-primary/30 hover:bg-background hover:shadow-md",
          "focus-visible:ring-primary/30",
        )}
        onClick={signWithGoogle}
        disabled={isLoading}
      >
        {isLoading ? (
          <Spinner className="mr-2 h-4 w-4 animate-spin" aria-hidden />
        ) : (
          <Icons.google className="mr-2 h-4 w-4 shrink-0" />
        )}
        Continue with Google
      </Button>
    </div>
  );
}

export default OAuthLoginButtons;
