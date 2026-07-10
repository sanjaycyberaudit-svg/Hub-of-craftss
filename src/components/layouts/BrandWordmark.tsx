import Image from "next/image";
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";
import {
  shopBoardSizeConfig,
  type ShopBoardBrandSize,
} from "@/lib/brand/shop-board";

export type BrandWordmarkSize = ShopBoardBrandSize;

type Props = {
  className?: string;
  size?: BrandWordmarkSize;
  align?: "left" | "center";
};

const LOGO_SRC = "/images/hub-of-craftss-logo.png";

const logoWidth: Record<BrandWordmarkSize, number> = {
  nav: 148,
  md: 180,
  footer: 220,
};

/** Hub of craftss logo lockup — full brand mark from logo artwork. */
export function BrandWordmark({
  className,
  size = "md",
  align = "left",
}: Props) {
  const config = shopBoardSizeConfig[size];
  const width = logoWidth[size];
  const height = Math.round(width * 0.55);

  return (
    <span
      className={cn(
        "brand-board-lockup inline-flex max-w-full items-center",
        size === "nav" && "brand-board-lockup--nav",
        align === "center" && "mx-auto justify-center",
        className,
      )}
      aria-label={`${siteConfig.shopBoardName}, ${siteConfig.location}`}
    >
      <Image
        src={LOGO_SRC}
        alt={siteConfig.shopBoardName}
        width={width}
        height={height}
        className="brand-board-emblem relative z-[2] h-auto max-h-[var(--brand-logo-max-h,4.5rem)] w-auto max-w-full object-contain"
        style={{
          maxHeight:
            size === "nav"
              ? config.emblemPx
              : size === "footer"
                ? 88
                : config.emblemPx + 12,
        }}
        priority={size === "nav"}
      />
    </span>
  );
}

export default BrandWordmark;
