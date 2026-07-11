"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";

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
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/components/ui/use-toast";
import { createClient } from "@/lib/supabase/client";
import {
  safeAuthErrorMessage,
  safeAuthRedirectError,
} from "@/lib/auth/safe-auth-errors";
import { getRedirectFromSearchParams } from "@/lib/auth/redirect";
import { authSchema } from "../validations";
import { PasswordInput } from "./PasswordInput";

type FormData = z.infer<typeof authSchema>;

type SignInFormProps = {
  initialEmail?: string;
  nextPath?: string;
  error?: string;
};

export function SignInForm({
  initialEmail = "",
  nextPath,
  error,
}: SignInFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const supabase = createClient();
  const [isPending, startTransition] = React.useTransition();

  const form = useForm<FormData>({
    resolver: zodResolver(authSchema),
    defaultValues: {
      email: initialEmail || "",
      password: "",
    },
  });

  React.useEffect(() => {
    if (error) {
      toast({
        title: "Error",
        description: safeAuthRedirectError(
          error,
          "Sign-in could not be completed. Please try again.",
        ),
      });
    }
  }, [error, toast]);

  function onSubmit({ email, password }: FormData) {
    startTransition(async () => {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        toast({
          title: "Error",
          description: safeAuthErrorMessage(
            signInError,
            "Sign-in failed. Check your email and password.",
          ),
        });
      } else {
        toast({ title: "Login Sucess" });
        router.refresh();
        const params = new URLSearchParams();
        if (nextPath) params.set("from", nextPath);
        router.push(getRedirectFromSearchParams(params));
      }
    });
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
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <PasswordInput
                  placeholder="**********"
                  {...field}
                  className="w-full"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end">
          <Link
            href="/forgot-password"
            className="text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            Forgot password?
          </Link>
        </div>
        <Button
          disabled={isPending}
          className="w-full bg-primary hover:bg-brand-magenta"
        >
          {isPending && (
            <Spinner className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
          )}
          Sign in
          <span className="sr-only">Sign in</span>
        </Button>
      </form>
    </Form>
  );
}

export default SignInForm;
