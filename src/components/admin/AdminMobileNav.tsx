"use client";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { SidebarNav } from "@/components/admin/SidebarNav";
import { AdminSidebarBrand } from "@/components/admin/AdminSidebarBrand";
import { AdminSidebarFooter } from "@/components/admin/AdminSidebarFooter";
import { dashboardConfig } from "@/config/dashboard";
import { siteConfig } from "@/config/site";
import { Menu } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type AdminMobileNavProps = {
  triggerClassName?: string;
};

export function AdminMobileNav({ triggerClassName }: AdminMobileNavProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "h-10 w-10 shrink-0 -ml-2 justify-center",
            triggerClassName,
          )}
          aria-label="Open admin menu"
        >
          <Menu className="h-6 w-6" strokeWidth={1.75} />
        </Button>
      </SheetTrigger>

      <SheetContent
        side="left"
        className="flex w-[min(100vw-3rem,var(--admin-sidebar-width))] flex-col gap-0 border-r p-0"
      >
        <SheetHeader className="border-b px-4 py-3 text-left">
          <SheetTitle className="sr-only">
            {siteConfig.shortName} Admin
          </SheetTitle>
          <AdminSidebarBrand className="flex items-center gap-3" />
        </SheetHeader>

        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="admin-scroll flex-1 overflow-y-auto px-3 py-4">
            <SidebarNav items={dashboardConfig.sidebarNav} />
          </div>
          <AdminSidebarFooter />
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function AdminMobileBrand() {
  return (
    <Link
      href="/admin/dashboard"
      className="truncate text-sm font-semibold text-foreground"
    >
      {siteConfig.shortName} Admin
    </Link>
  );
}
