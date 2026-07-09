import { storefrontHeaderStyleContent } from "@/lib/brand/storefront-header";

/** Injects storefront header CSS vars derived from shop-board sizing. */
export function StoreHeaderMetrics() {
  return (
    <style
      dangerouslySetInnerHTML={{ __html: storefrontHeaderStyleContent() }}
    />
  );
}
