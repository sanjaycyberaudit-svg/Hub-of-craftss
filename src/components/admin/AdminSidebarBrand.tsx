import Image from "next/image";
import Link from "next/link";

import { siteConfig } from "@/config/site";

type AdminSidebarBrandProps = {
  className?: string;
};

export function AdminSidebarBrand({ className }: AdminSidebarBrandProps) {
  return (
    <Link href="/admin/dashboard" className={className}>
      <Image
        src="/images/ssr-tex-emblem.svg"
        alt=""
        width={32}
        height={32}
        className="h-8 w-8 shrink-0 rounded-md"
        priority
      />
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold text-foreground">
          {siteConfig.shortName}
        </span>
        <span className="mt-0.5 block text-xs font-normal text-muted-foreground">
          Admin
        </span>
      </span>
    </Link>
  );
}
