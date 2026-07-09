"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ComponentProps, MouseEvent } from "react";
import { startViewTransition } from "@/lib/view-transitions";

type Props = ComponentProps<typeof Link>;

export function ViewTransitionLink({
  href,
  onClick,
  prefetch,
  ...props
}: Props) {
  const router = useRouter();

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event);
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }

    const target =
      typeof href === "string"
        ? href
        : typeof href === "object" && href.pathname
          ? href.pathname
          : null;

    if (!target || target.startsWith("http") || target.startsWith("#")) {
      return;
    }

    event.preventDefault();
    startViewTransition(() => {
      router.push(href as Parameters<typeof router.push>[0]);
    });
  };

  return (
    <Link href={href} onClick={handleClick} prefetch={prefetch} {...props} />
  );
}
