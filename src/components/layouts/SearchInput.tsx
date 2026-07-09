"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "../ui/button";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";
import { Icons } from "./icons";
import { Input } from "../ui/input";
import { useRouter, useSearchParams } from "next/navigation";

const filterSelectionSchema = z.object({
  search: z.string(),
});

type SearchInputProps = {
  autoFocus?: boolean;
  variant?: "default" | "compact";
  onSearchSubmit?: () => void;
  className?: string;
};

function SearchInput({
  autoFocus = false,
  variant = "default",
  onSearchSubmit,
  className,
}: SearchInputProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isFocused, setIsFocused] = useState(false);
  const isCompact = variant === "compact";

  const form = useForm<z.infer<typeof filterSelectionSchema>>({
    resolver: zodResolver(filterSelectionSchema),
    defaultValues: { search: searchParams.get("search") || "" },
  });

  function onSubmit({ search }: z.infer<typeof filterSelectionSchema>) {
    onSearchSubmit?.();
    const trimmed = search.trim();
    router.push(
      !trimmed ? "/shop" : `/shop?search=${encodeURIComponent(trimmed)}`,
    );
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className={cn(
          "relative flex-1",
          isCompact
            ? "flex w-full items-center"
            : "rounded-full bg-background/95 p-4 backdrop-blur supports-[backdrop-filter]:bg-background/60",
          className,
        )}
      >
        {!isCompact ? (
          <Icons.search
            className={cn(
              isFocused ? "scale-0" : "scale-100",
              "absolute left-8 top-6 h-6 w-4 text-muted-foreground transition-all duration-500",
            )}
          />
        ) : null}

        <FormField
          control={form.control}
          name="search"
          render={({ field }) => (
            <FormItem className={isCompact ? "w-full space-y-0" : undefined}>
              <FormControl>
                <Input
                  {...field}
                  autoFocus={autoFocus}
                  enterKeyHint="search"
                  placeholder={siteConfig.searchPlaceholder}
                  className={cn(
                    isCompact
                      ? "h-11 rounded-full pl-10 pr-12"
                      : cn(
                          isFocused ? "pl-6" : "pl-10",
                          "rounded-full transition-all duration-500",
                        ),
                  )}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button
          className={cn(
            isCompact
              ? "absolute right-1 top-1/2 h-9 w-9 -translate-y-1/2"
              : "absolute right-4 top-4",
          )}
          type="submit"
          variant={isCompact ? "ghost" : "link"}
          size={isCompact ? "icon" : "default"}
          aria-label="Submit search"
        >
          <Icons.search
            className={cn(
              "h-4 w-4 text-muted-foreground transition-all duration-200",
              isCompact || isFocused
                ? "opacity-100 scale-100"
                : "opacity-0 scale-0",
            )}
          />
        </Button>
        {isCompact ? (
          <Icons.search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        ) : null}
      </form>
    </Form>
  );
}

export default SearchInput;
