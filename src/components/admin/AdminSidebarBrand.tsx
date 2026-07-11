import Image from "next/image";
import Link from "next/link";

import { siteConfig } from "@/config/site";
import { BRAND_LOGO } from "@/lib/brand/logo";

type AdminSidebarBrandProps = {
  className?: string;
};

export function AdminSidebarBrand({ className }: AdminSidebarBrandProps) {
  return (
    <Link href="/admin/dashboard" className={className}>
      <Image
        src={BRAND_LOGO.src}
        alt=""
        width={BRAND_LOGO.width}
        height={BRAND_LOGO.height}
        className="h-16 w-auto max-w-[14rem] shrink-0 object-contain object-left"
        priority
      />
      <span className="min-w-0">
        <span className="block truncate text-base font-semibold text-foreground">
          {siteConfig.shortName}
        </span>
        <span className="mt-0.5 block text-xs font-normal text-muted-foreground">
          Admin
        </span>
      </span>
    </Link>
  );
}
