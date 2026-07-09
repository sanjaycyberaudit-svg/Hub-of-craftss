"use client";

import * as React from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { createClient } from "@/lib/supabase/client";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";

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
import { PasswordInput } from "./PasswordInput";
import { signupSchema } from "../validations";

type FormData = z.infer<typeof signupSchema>;

export function SignUpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const supabase = createClient();
  const [isLoading, setIsLoading] = React.useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      name: "",
      email: searchParams.get("email") || "",
      password: "",
    },
  });

  React.useEffect(() => {
    const sensitiveParams = ["password", "name"] as const;
    const url = new URL(window.location.href);
    let changed = false;

    for (const key of sensitiveParams) {
      if (url.searchParams.has(key)) {
        url.searchParams.delete(key);
        changed = true;
      }
    }

    if (changed) {
      window.history.replaceState({}, "", `${url.pathname}${url.search}`);
    }
  }, [searchParams]);

  async function onSubmit({ email, password, name }: FormData) {
    setIsLoading(true);
    const from = searchParams?.get("from");
    const unknownError = "Something went wrong, please try again.";

    try {
      const signupResponse = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name }),
      });
      const signupBody = (await signupResponse.json().catch(() => ({}))) as {
        message?: string;
      };

      if (!signupResponse.ok) {
        toast({
          title: "Error",
          description: signupBody.message || unknownError,
        });
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast({
          title: "Account created",
          description: "Please sign in with your email and password.",
        });
        router.push("/sign-in");
        setIsLoading(false);
        return;
      }

      if (data.session) {
        router.push(from ? from : "/");
        router.refresh();
      }
    } catch {
      toast({
        title: "Error",
        description: unknownError,
      });
    }

    setIsLoading(false);
  }

  return (
    <Form {...form}>
      <form
        className="grid gap-4"
        onSubmit={(...args) => void form.handleSubmit(onSubmit)(...args)}
      >
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="How should we call you?" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

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
                <PasswordInput placeholder="**********" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button
          disabled={isLoading}
          className="w-full bg-primary hover:bg-[#55104A]"
        >
          {isLoading && (
            <Icons.spinner
              className="mr-2 h-4 w-4 animate-spin"
              aria-hidden="true"
            />
          )}
          Continue
          <span className="sr-only">Continue to email verification page</span>
        </Button>
      </form>
    </Form>
  );
}

export default SignUpForm;
