import Image from "next/image";
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";
import {
  shopBoardSizeConfig,
  type ShopBoardBrandSize,
} from "@/lib/brand/shop-board";
import { ShopBoardPanel } from "./ShopBoardPanel";

export type BrandWordmarkSize = ShopBoardBrandSize;

type Props = {
  className?: string;
  size?: BrandWordmarkSize;
  align?: "left" | "center";
};

function GoldRule({ widthPx }: { widthPx: number }) {
  return (
    <span
      className="brand-board-rule shrink-0"
      style={{ width: widthPx }}
      aria-hidden
    />
  );
}

/** Shop sign lockup — transparent SSR medallion left + purple text panel right. */
export function BrandWordmark({
  className,
  size = "md",
  align = "left",
}: Props) {
  const config = shopBoardSizeConfig[size];

  return (
    <span
      className={cn(
        "brand-board-lockup inline-flex max-w-full items-center",
        size === "nav" && "brand-board-lockup--nav",
        align === "center" && "mx-auto",
        className,
      )}
      aria-label={`${siteConfig.shopBoardName}, ${siteConfig.location}`}
    >
      <Image
        src="/images/ssr-emblem.png"
        alt=""
        width={config.emblemPx}
        height={config.emblemPx}
        className="brand-board-emblem relative z-[2] shrink-0 object-contain"
        style={{ marginLeft: config.emblemOffsetRightPx }}
        aria-hidden
        priority={size === "nav"}
      />

      <ShopBoardPanel
        slantPercent={config.slantPercent}
        minHeight={config.panelMinHeight}
        padX={config.panelPadX}
        padY={config.panelPadY}
        className={cn(`brand-board-panel--${size} relative z-[1]`)}
        style={{ marginLeft: -config.emblemOverlapPx }}
      >
        <span
          className="brand-board-name block max-w-full whitespace-nowrap font-[family-name:var(--font-hero-serif)] font-bold"
          style={{ fontSize: config.nameFontPx, lineHeight: 1.15 }}
        >
          {siteConfig.shopBoardName}
        </span>

        <span className="mt-1 flex w-full items-center justify-center gap-1.5">
          <GoldRule widthPx={config.lineWidthPx} />
          <span
            className="brand-board-location whitespace-nowrap font-[family-name:var(--font-brand-sans)] font-bold uppercase"
            style={{
              fontSize: config.locationFontPx,
              letterSpacing: config.locationTracking,
              lineHeight: 1.2,
            }}
          >
            {siteConfig.location}
          </span>
          <GoldRule widthPx={config.lineWidthPx} />
        </span>
      </ShopBoardPanel>
    </span>
  );
}

export default BrandWordmark;
