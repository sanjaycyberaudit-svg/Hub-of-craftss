import * as React from "react";

import { cn } from "@/lib/utils";

interface ShellProps
  extends React.DetailedHTMLProps<
    React.HTMLAttributes<HTMLDivElement>,
    HTMLDivElement
  > {
  children: React.ReactNode;
  layout?: "default" | "dashboard" | "narrow";
}

export function Shell({
  children,
  layout = "default",
  className,
  ...props
}: ShellProps) {
  return (
    <section
      className={cn(
        "grid w-full min-w-0 max-w-full items-center gap-6 pb-6 pt-2 md:gap-8 md:pb-8 md:pt-6",
        layout === "default" && "container px-4 sm:px-6",
        layout === "narrow" && "container max-w-5xl px-4 sm:px-6",
        className,
      )}
      {...props}
    >
      {children}
    </section>
  );
}
