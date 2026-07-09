import { CartSheet } from "@/features/carts";
import { MobileMenuProvider } from "@/components/layouts/MobileMenuContext";
import { MobileSearchProvider } from "@/components/layouts/MobileSearchContext";
import { MobileSearchOverlay } from "@/components/layouts/MobileSearchOverlay";
import Navbar from "@/components/layouts/MainNavbar";
import { StoreFloatingActions } from "@/components/layouts/StoreFloatingActions";
import { MobileBottomNav } from "@/components/layouts/MobileBottomNav";
import { ReactNode } from "react";

/** Sign-in / sign-up wrapped in the same chrome as the storefront. */
export function AuthStoreShell({ children }: { children: ReactNode }) {
  return (
    <MobileMenuProvider>
      <MobileSearchProvider>
        <Navbar />
        <MobileSearchOverlay />
        <main className="w-full max-w-[100vw] overflow-x-hidden pt-[var(--store-header-offset-mobile)] md:pt-[var(--store-header-offset-desktop)] pb-[var(--mobile-nav-height)] md:pb-10">
          <div className="container flex justify-center px-4 py-6 sm:py-10">
            <div className="w-full max-w-md rounded-2xl border border-primary/15 bg-card p-6 shadow-sm sm:p-8">
              {children}
            </div>
          </div>
        </main>
        <CartSheet />
        <StoreFloatingActions />
        <MobileBottomNav />
      </MobileSearchProvider>
    </MobileMenuProvider>
  );
}
