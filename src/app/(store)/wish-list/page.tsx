import RecommendationProductsSection from "@/features/products/components/RecommendationProductsSection";
import { Shell } from "@/components/layouts/Shell";
import Link from "next/link";

export const revalidate = 120;

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
