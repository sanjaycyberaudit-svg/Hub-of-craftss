import Link from "next/link";
import { SEO_PRIMARY_NAV } from "@/lib/seo/constants";

export function HomeExploreLinks() {
  return (
    <section
      className="craft-kraft craft-torn-top rounded-2xl px-4 py-8 md:px-6 md:py-10"
      aria-labelledby="explore-hoc-heading"
    >
      <h2
        id="explore-hoc-heading"
        className="font-[family-name:var(--font-hero-serif)] text-xl font-semibold text-foreground md:text-2xl"
      >
        Explore Hub of craftss
      </h2>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground md:text-base">
        Shop terracotta raw materials and art & craft supplies online, browse
        collections, and visit us in Madurai — Make · Craft · Create.
      </p>
      <nav
        className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
        aria-label="Primary store sections"
      >
        {SEO_PRIMARY_NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-xl border border-brand-teal/20 bg-white/90 p-4 transition hover:border-brand-magenta/40 hover:bg-white"
          >
            <h3 className="text-sm font-semibold text-brand-teal md:text-base">
              {item.name}
            </h3>
            <p className="mt-1 text-xs text-muted-foreground md:text-sm">
              {item.description}
            </p>
          </Link>
        ))}
      </nav>
    </section>
  );
}
