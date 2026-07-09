import { CartSheet } from "@/features/carts";
import MainFooter from "@/components/layouts/MainFooter";
import { MobileMenuProvider } from "@/components/layouts/MobileMenuContext";
import { MobileSearchProvider } from "@/components/layouts/MobileSearchContext";
import { MobileSearchOverlay } from "@/components/layouts/MobileSearchOverlay";
import Navbar from "@/components/layouts/MainNavbar";
import { StoreHeaderMetrics } from "@/components/layouts/StoreHeaderMetrics";
import { StoreFloatingActions } from "@/components/layouts/StoreFloatingActions";
import { MobileBottomNav } from "@/components/layouts/MobileBottomNav";
import { JsonLd } from "@/components/seo/JsonLd";
import { resolveStorefrontRuntimeBundle } from "@/lib/integrations/settings";
import { sweepExpiredStockReservationsIfEnabled } from "@/lib/orders/lazy-stock-reservation-sweep";
import {
  buildOrganizationJsonLd,
  buildSiteNavigationJsonLd,
  buildStoreJsonLd,
  buildWebsiteJsonLd,
} from "@/lib/seo/json-ld";
import { AnnouncementsProvider } from "@/providers/AnnouncementsProvider";
import { BulkOrderGuardProvider } from "@/providers/BulkOrderGuardProvider";
import { CourierChargesProvider } from "@/providers/CourierChargesProvider";
import { OfferCodesProvider } from "@/providers/OfferCodesProvider";
import { ShopContactProvider } from "@/providers/ShopContactProvider";
import { SocialLinksProvider } from "@/providers/SocialLinksProvider";
import { StockControlProvider } from "@/providers/StockControlProvider";
import { ReactNode } from "react";

type Props = { children: ReactNode };

export const revalidate = 60;

async function StoreLayout({ children }: Props) {
  const {
    contact,
    social,
    announcements,
    bulkOrderGuard,
    stockControl,
    courierCharges,
    offerCodes,
  } = await resolveStorefrontRuntimeBundle();

  if (stockControl.enabled) {
    await sweepExpiredStockReservationsIfEnabled({
      stockControlEnabled: true,
    }).catch((error) => {
      console.error("[store] stock reservation sweep failed:", error);
    });
  }

  return (
    <SocialLinksProvider social={social}>
      <ShopContactProvider contact={contact}>
        <JsonLd
          data={[
            buildOrganizationJsonLd(),
            buildWebsiteJsonLd(),
            buildStoreJsonLd(),
            buildSiteNavigationJsonLd(),
          ]}
        />
        <AnnouncementsProvider announcements={announcements}>
          <BulkOrderGuardProvider config={bulkOrderGuard}>
            <StockControlProvider config={stockControl}>
              <CourierChargesProvider config={courierCharges}>
                <OfferCodesProvider config={offerCodes}>
                  <MobileMenuProvider>
                    <MobileSearchProvider>
                      <StoreHeaderMetrics />
                      <Navbar />
                      <MobileSearchOverlay />
                      <main className="w-full max-w-[100vw] overflow-x-hidden pt-[var(--store-header-offset-mobile)] md:pt-[var(--store-header-offset-desktop)] pb-[var(--mobile-nav-height)] md:pb-0">
                        {children}
                      </main>
                      <CartSheet />
                      <StoreFloatingActions />
                      <MobileBottomNav />
                      <div className="md:contents pb-[var(--mobile-nav-height)] md:pb-0">
                        <MainFooter />
                      </div>
                    </MobileSearchProvider>
                  </MobileMenuProvider>
                </OfferCodesProvider>
              </CourierChargesProvider>
            </StockControlProvider>
          </BulkOrderGuardProvider>
        </AnnouncementsProvider>
      </ShopContactProvider>
    </SocialLinksProvider>
  );
}

export default StoreLayout;
