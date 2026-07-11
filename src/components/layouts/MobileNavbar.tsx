import { Suspense } from "react";
import {
  AdminMobileBrand,
  AdminMobileNav,
} from "@/components/admin/AdminMobileNav";
import Branding from "./Branding";
import { MobileSearchTrigger } from "./MobileSearchOverlay";
import { SideMenu } from "./SideMenu";
import Link from "next/link";
import { Icons } from "./icons";

type Props = { adminLayout: boolean };

const edgeInset = "max(0.75rem, env(safe-area-inset-left, 0px))" as const;
const edgeInsetRight = "max(0.75rem, env(safe-area-inset-right, 0px))" as const;

function MobileNavbar({ adminLayout }: Props) {
  return (
    <div className="relative h-[var(--store-nav-height-mobile)] min-h-[var(--store-nav-height-mobile)] w-full md:hidden">
      <div
        className="absolute inset-y-0 left-0 z-[2] flex items-center"
        style={{ paddingLeft: edgeInset }}
      >
        {adminLayout ? (
          <AdminMobileNav triggerClassName="ml-0" />
        ) : (
          <SideMenu triggerClassName="ml-0" />
        )}
      </div>

      <div className="flex h-full min-w-0 items-center justify-center px-[2.75rem]">
        {adminLayout ? (
          <AdminMobileBrand />
        ) : (
          <Branding
            size="nav"
            align="center"
            className="max-w-[min(100%,22rem)]"
          />
        )}
      </div>

      <div
        className="absolute inset-y-0 right-0 z-[2] flex items-center gap-0.5"
        style={{ paddingRight: edgeInsetRight }}
      >
        {!adminLayout ? (
          <>
            <MobileSearchTrigger className="h-11 w-11 shrink-0 touch-manipulation" />
            <Link
              href="/cart"
              className="inline-flex h-11 w-11 items-center justify-center rounded-full hover:bg-muted touch-manipulation"
              aria-label="Cart"
            >
              <Suspense fallback={null}>
                <Icons.cart className="h-5 w-5" />
              </Suspense>
            </Link>
          </>
        ) : (
          <span className="inline-flex h-11 w-11 shrink-0" aria-hidden />
        )}
      </div>
    </div>
  );
}

export default MobileNavbar;
