import RecommendationProductsSection from "@/features/products/components/RecommendationProductsSection";
import { Shell } from "@/components/layouts/Shell";
import { STOREFRONT_REVALIDATE_SECONDS } from "@/lib/cache/constants";
import Link from "next/link";

export const revalidate = STOREFRONT_REVALIDATE_SECONDS;

export default function WishListPage() {
  return (
    <Shell>
      <section className="flex justify-between items-center py-8">
        <h1 className="text-3xl">Your Wishlist</h1>
        <Link href="/shop">Continue shopping</Link>
      </section>

      <RecommendationProductsSection />
    </Shell>
  );
}
