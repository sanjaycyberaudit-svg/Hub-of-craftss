import Image from "next/image";
import { siteConfig } from "@/config/site";
import { BRAND_LOGO, brandLogoMaxHeight } from "@/lib/brand/logo";
import { cn } from "@/lib/utils";
import type { ShopBoardBrandSize } from "@/lib/brand/shop-board";

export type BrandWordmarkSize = ShopBoardBrandSize;

type Props = {
  className?: string;
  size?: BrandWordmarkSize;
  align?: "left" | "center";
};

/** Hub of craftss logo lockup — fixed height so header width cannot shrink it. */
export function BrandWordmark({
  className,
  size = "md",
  align = "left",
}: Props) {
  const height = brandLogoMaxHeight[size];
  const width = Math.round((BRAND_LOGO.width / BRAND_LOGO.height) * height);

  return (
    <span
      className={cn(
        "brand-board-lockup inline-flex shrink-0 items-center",
        size === "nav" && "brand-board-lockup--nav",
        align === "center" && "mx-auto justify-center",
        className,
      )}
      aria-label={`${siteConfig.shopBoardName} — ${siteConfig.tagline}`}
    >
      <Image
        src={BRAND_LOGO.src}
        alt={siteConfig.shopBoardName}
        width={BRAND_LOGO.width}
        height={BRAND_LOGO.height}
        className="brand-board-emblem relative z-[2] shrink-0 object-contain object-left"
        style={{ height, width, maxWidth: "none" }}
        sizes={`${width}px`}
        priority={size === "nav"}
      />
    </span>
  );
}

export default BrandWordmark;
