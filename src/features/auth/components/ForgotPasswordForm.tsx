"use client";

import * as React from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Icons } from "@/components/layouts/icons";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { buildOAuthCallbackUrl } from "@/lib/auth/callback";
import { safeAuthErrorMessage } from "@/lib/auth/safe-auth-errors";
import { forgotPasswordEmailSchema } from "@/features/auth/validations";
import { createClient } from "@/lib/supabase/client";

type FormData = z.infer<typeof forgotPasswordEmailSchema>;

export function ForgotPasswordForm() {
  const { toast } = useToast();
  const supabase = createClient();
  const [isLoading, setIsLoading] = React.useState(false);
  const [emailSent, setEmailSent] = React.useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(forgotPasswordEmailSchema),
    defaultValues: { email: "" },
  });

  async function onSubmit({ email }: FormData) {
    setIsLoading(true);

    const redirectTo = buildOAuthCallbackUrl(
      window.location.origin,
      "/reset-password",
    );

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });

    setIsLoading(false);

    if (error) {
      toast({
        title: "Could not send reset email",
        description: safeAuthErrorMessage(
          error,
          "Could not send reset email. Please try again.",
        ),
      });
      return;
    }

    setEmailSent(true);
    toast({
      title: "Check your email",
      description:
        "If an account exists for that address, a reset link was sent. Links expire in 1 hour.",
    });
  }

  if (emailSent) {
    return (
      <div className="space-y-4 text-sm">
        <p className="text-muted-foreground">
          We sent a password reset link if an account exists for{" "}
          <span className="font-medium text-foreground">
            {form.getValues("email")}
          </span>
          . The link expires within one hour.
        </p>
        <Link
          href="/sign-in"
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          ← Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form
        className="grid gap-4"
        onSubmit={(...args) => void form.handleSubmit(onSubmit)(...args)}
      >
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input placeholder="email@domain.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button
          disabled={isLoading}
          className="w-full bg-primary hover:bg-brand-rose"
        >
          {isLoading && (
            <Icons.spinner
              className="mr-2 h-4 w-4 animate-spin"
              aria-hidden="true"
            />
          )}
          Send reset link
        </Button>
      </form>
    </Form>
  );
}

export default ForgotPasswordForm;
