"use client";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { siteConfig } from "@/config/site";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Check, Menu } from "lucide-react";
import { useEffect, useState } from "react";
import { useMobileMenu } from "./MobileMenuContext";
import SocialMedias from "./SocialMedias";
import { cn } from "@/lib/utils";
import { useRobustNavigate } from "@/hooks/useRobustNavigate";

const navLinkBase =
  "flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors touch-manipulation";

type NavItem = { title: string; href: string };

const primaryNav: NavItem[] = [
  { title: "Home", href: "/" },
  { title: "Shop", href: "/shop" },
  ...siteConfig.mainNav.map(({ title, href }) => ({ title, href })),
  { title: "Wishlist", href: "/wish-list" },
  { title: "Cart", href: "/cart" },
];

function isNavActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

type SideMenuProps = {
  triggerClassName?: string;
};

function SideNavLink({
  item,
  pathname,
  onNavigate,
}: {
  item: NavItem;
  pathname: string;
  onNavigate: (event: React.MouseEvent<HTMLAnchorElement>) => void;
}) {
  const active = isNavActive(pathname, item.href);

  return (
    <SheetClose asChild>
      <Link
        href={item.href}
        prefetch
        onClick={onNavigate}
        aria-current={active ? "page" : undefined}
        className={cn(
          navLinkBase,
          active
            ? "border-l-[3px] border-primary bg-primary/12 pl-[calc(0.75rem-3px)] font-semibold text-primary"
            : "border-l-[3px] border-transparent text-foreground hover:bg-primary/10",
        )}
      >
        <span className="flex-1">{item.title}</span>
        {active ? (
          <Check
            className="h-4 w-4 shrink-0 text-primary"
            strokeWidth={2.5}
            aria-hidden
          />
        ) : null}
      </Link>
    </SheetClose>
  );
}

export function SideMenu({ triggerClassName }: SideMenuProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { setOpen: setMenuOpenGlobal } = useMobileMenu();
  const { onNavigateClick } = useRobustNavigate();

  const closeMenu = () => setOpen(false);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    setMenuOpenGlobal(next);
  };

  useEffect(() => {
    setOpen(false);
    setMenuOpenGlobal(false);
  }, [pathname, setMenuOpenGlobal]);

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "h-10 w-10 shrink-0 -ml-2 justify-center",
            triggerClassName,
          )}
          aria-label="Open menu"
        >
          <Menu className="h-6 w-6" strokeWidth={1.75} />
        </Button>
      </SheetTrigger>

      <SheetContent
        side="left"
        mobileNavSafe
        className="flex w-[min(100vw-3rem,320px)] flex-col gap-0 border-r border-primary/15 p-0 sm:max-w-xs"
      >
        <SheetHeader className="border-b border-primary/15 bg-primary/[0.06] px-4 py-3 text-left">
          <SheetTitle className="text-base font-semibold text-foreground">
            Menu
          </SheetTitle>
        </SheetHeader>

        <nav
          className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-4 py-4"
          aria-label="Main"
        >
          {primaryNav.map((item) => (
            <SideNavLink
              key={item.href}
              item={item}
              pathname={pathname}
              onNavigate={(event) => {
                closeMenu();
                onNavigateClick(item.href)(event);
              }}
            />
          ))}
        </nav>

        <div className="shrink-0 border-t border-primary/15 bg-muted/30 px-4 py-4">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-primary/70">
            Follow us
          </p>
          <SocialMedias variant="compact" colored />
        </div>
      </SheetContent>
    </Sheet>
  );
}
