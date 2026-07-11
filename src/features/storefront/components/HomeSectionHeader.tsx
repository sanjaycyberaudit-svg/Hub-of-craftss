import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  title: string;
  titleAccent?: string;
  href?: string;
  viewMoreLabel?: string;
  showViewMore?: boolean;
};

export function HomeSectionHeader({
  title,
  titleAccent,
  href = "/shop",
  viewMoreLabel = "View More",
  showViewMore = true,
}: Props) {
  return (
    <header className="mb-4 flex min-w-0 flex-col gap-2 sm:mb-5 sm:flex-row sm:items-center sm:justify-between sm:gap-3 md:mb-6">
      <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
        <span className="craft-washi" aria-hidden />
        <h2 className="min-w-0 text-lg font-bold leading-tight tracking-tight sm:text-xl md:text-2xl">
          {title}
          {titleAccent ? (
            <span className="bg-gradient-to-r from-brand-rose to-brand-gold bg-clip-text text-transparent">
              {" "}
              {titleAccent}
            </span>
          ) : null}
        </h2>
      </div>
      {showViewMore ? (
        <Link
          href={href}
          className={cn(
            "craft-stitch group inline-flex w-fit shrink-0 items-center gap-1.5 rounded-full bg-white/90 px-4 py-2 text-xs font-semibold text-brand-rose sm:text-sm",
            "transition-colors hover:border-brand-gold hover:bg-brand-rose hover:text-white",
          )}
        >
          {viewMoreLabel}
          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </Link>
      ) : null}
    </header>
  );
}
