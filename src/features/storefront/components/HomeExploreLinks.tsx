import Link from "next/link";
import { SEO_PRIMARY_NAV } from "@/lib/seo/constants";

export function HomeExploreLinks() {
  return (
    <section
      className="border-t py-8 md:py-10"
      aria-labelledby="explore-sakthi-heading"
    >
      <h2
        id="explore-sakthi-heading"
        className="font-[family-name:var(--font-hero-serif)] text-xl font-semibold text-foreground md:text-2xl"
      >
        Explore SRI SAI RAGHAVENDRA TEX
      </h2>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground md:text-base">
        Shop premium silk and cotton sarees online, browse collections, and
        contact our Salem store for wholesale and retail orders.
      </p>
      <nav
        className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
        aria-label="Primary store sections"
      >
        {SEO_PRIMARY_NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-lg border bg-card p-4 transition hover:border-primary/40 hover:bg-primary/5"
          >
            <h3 className="text-sm font-semibold text-primary md:text-base">
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
