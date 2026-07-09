/** SSR Tex shop-board — SVG panel with forward-slanted right edge */
export type ShopBoardBrandSize = "nav" | "md" | "footer";

type SizeConfig = {
  panelMinHeight: number;
  /** Transparent medallion — matches sign height */
  emblemPx: number;
  /** Panel tucks under emblem right edge (px) */
  emblemOverlapPx: number;
  /** Shift emblem right (px) — logo position only */
  emblemOffsetRightPx: number;
  nameFontPx: number;
  locationFontPx: number;
  locationTracking: string;
  panelPadX: number;
  panelPadY: number;
  /** Forward slant: top-right extends past bottom-right (% of panel width) */
  slantPercent: number;
  lineWidthPx: number;
};

export const shopBoardSizeConfig: Record<ShopBoardBrandSize, SizeConfig> = {
  nav: {
    panelMinHeight: 44,
    emblemPx: 58,
    emblemOverlapPx: 18,
    emblemOffsetRightPx: 16,
    nameFontPx: 13,
    locationFontPx: 8,
    locationTracking: "0.18em",
    panelPadX: 14,
    panelPadY: 8,
    slantPercent: 11,
    lineWidthPx: 20,
  },
  md: {
    panelMinHeight: 48,
    emblemPx: 66,
    emblemOverlapPx: 20,
    emblemOffsetRightPx: 18,
    nameFontPx: 16,
    locationFontPx: 10,
    locationTracking: "0.2em",
    panelPadX: 18,
    panelPadY: 10,
    slantPercent: 12,
    lineWidthPx: 24,
  },
  footer: {
    panelMinHeight: 76,
    emblemPx: 86,
    emblemOverlapPx: 26,
    emblemOffsetRightPx: 10,
    nameFontPx: 19,
    locationFontPx: 11,
    locationTracking: "0.22em",
    panelPadX: 20,
    panelPadY: 12,
    slantPercent: 12,
    lineWidthPx: 28,
  },
};
