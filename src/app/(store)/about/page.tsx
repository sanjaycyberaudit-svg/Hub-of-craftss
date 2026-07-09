import InfoPage from "@/components/layouts/InfoPage";
import Link from "next/link";
import { Metadata } from "next";
import { STOREFRONT_STATIC_REVALIDATE_SECONDS } from "@/lib/cache/constants";

export const revalidate = STOREFRONT_STATIC_REVALIDATE_SECONDS;

export const metadata: Metadata = {
  title: "Our Story | SRI SAI RAGHAVENDRA TEX",
  description:
    "About SRI SAI RAGHAVENDRA TEX — authentic sarees from Salem, Tamil Nadu",
};

export default function AboutPage() {
  return (
    <InfoPage
      heading="Our Story"
      description="SRI SAI RAGHAVENDRA TEX — trusted sarees for every occasion, from our family to yours."
    >
      <p>
        SRI SAI RAGHAVENDRA TEX has been serving customers across Tamil Nadu
        with authentic silk and cotton sarees for festivals, weddings, and
        everyday elegance. From Kanjivaram and soft silk to cotton and wedding
        collections, we curate quality pieces for retail and wholesale buyers.
      </p>
      <p>
        Based in Salem district, we combine the warmth of a local textile shop
        with the convenience of online ordering. Whether you visit our showroom
        or shop from home, our team is here to help you find the right saree.
      </p>
      <p>
        Browse our{" "}
        <Link href="/collections" className="text-primary hover:underline">
          collections
        </Link>
        , explore{" "}
        <Link href="/featured" className="text-primary hover:underline">
          featured sarees
        </Link>
        , or{" "}
        <Link href="/contact" className="text-primary hover:underline">
          get in touch
        </Link>{" "}
        for wedding and bulk orders.
      </p>
    </InfoPage>
  );
}
