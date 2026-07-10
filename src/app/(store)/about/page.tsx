import InfoPage from "@/components/layouts/InfoPage";
import Link from "next/link";
import { Metadata } from "next";
import { siteConfig } from "@/config/site";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: `Our Story | ${siteConfig.name}`,
  description: `About ${siteConfig.name} — terracotta raw materials and art & craft supplies from Madurai.`,
};

export default function AboutPage() {
  return (
    <InfoPage
      heading="Our Story"
      description={`${siteConfig.name} by Shaaru — ${siteConfig.tagline}.`}
    >
      <p>
        {siteConfig.name} is your hub for terracotta raw materials and art &amp;
        craft supplies. We help makers, hobbyists, and wholesale buyers find
        quality materials to make, craft, and create.
      </p>
      <p>
        Based in Madurai, Tamil Nadu ({siteConfig.address}), we combine the
        warmth of a local craft shop with convenient online ordering. Follow us
        on Instagram{" "}
        <a
          href={siteConfig.social.instagram}
          className="text-primary hover:underline"
          target="_blank"
          rel="noreferrer"
        >
          @hub_of_craftss_by_shaaru
        </a>{" "}
        for new arrivals and ideas.
      </p>
      <p>
        Browse our{" "}
        <Link href="/collections" className="text-primary hover:underline">
          collections
        </Link>
        , explore{" "}
        <Link href="/featured" className="text-primary hover:underline">
          featured products
        </Link>
        , or{" "}
        <Link href="/contact" className="text-primary hover:underline">
          get in touch
        </Link>{" "}
        for orders and enquiries.
      </p>
    </InfoPage>
  );
}
