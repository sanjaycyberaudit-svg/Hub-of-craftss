"use client";
import { useAuth } from "@/providers/AuthProvider";
import type { CartPagePrefetch } from "@/lib/storefront/cart-server";
import type { User } from "@supabase/supabase-js";
import UserCartSection from "./UserCartSection";
import GuestCartSection from "./GuestCartSection";

type CartSectionProps = Pick<
  CartPagePrefetch,
  "guestCartProducts" | "userCart" | "sizeConfigs" | "prefetchedProductIds"
> & {
  serverUserId?: string | null;
};

function CartSection({
  serverUserId,
  guestCartProducts,
  userCart,
  sizeConfigs,
  prefetchedProductIds,
}: CartSectionProps) {
  const { user: clientUser } = useAuth();
  const activeUserId = clientUser?.id ?? serverUserId ?? null;

  if (activeUserId) {
    const user: User =
      clientUser ??
      ({
        id: activeUserId,
        app_metadata: {},
        user_metadata: {},
        aud: "authenticated",
        created_at: "",
      } as User);

    return (
      <UserCartSection
        user={user}
        initialCart={userCart}
        initialSizeConfigs={sizeConfigs}
        prefetchedProductIds={prefetchedProductIds}
      />
    );
  }

  return (
    <GuestCartSection
      initialProducts={guestCartProducts}
      initialSizeConfigs={sizeConfigs}
      prefetchedProductIds={prefetchedProductIds}
    />
  );
}

export default CartSection;
