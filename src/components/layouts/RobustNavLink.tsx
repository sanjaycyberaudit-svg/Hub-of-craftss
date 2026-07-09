"use client";

import Link from "next/link";
import type { ComponentProps } from "react";
import { useRobustNavigate } from "@/hooks/useRobustNavigate";

type RobustNavLinkProps = Omit<ComponentProps<typeof Link>, "onClick"> & {
  href: string;
};

/** Storefront link that falls back to full page load when soft navigation stalls. */
export function RobustNavLink({
  href,
  children,
  ...props
}: RobustNavLinkProps) {
  const { onNavigateClick } = useRobustNavigate();

  return (
    <Link href={href} onClick={onNavigateClick(href)} {...props}>
      {children}
    </Link>
  );
}
