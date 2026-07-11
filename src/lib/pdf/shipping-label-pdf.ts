import { siteConfig } from "@/config/site";

/** Minimal order shape for shipping-label PDFs (matches Software-Saree-order). */
export type PdfLabelOrder = {
  id: string;
  sender_details: string;
  recipient_details: string;
};

/** Options passed from fetchPdfSettingsForRendering; used for centre block and vertical position. */
export type PdfRenderOptions = {
  settings: {
    content_type: "text" | "logo";
    placement: "top" | "bottom";
    text_size: number;
    text_bold?: boolean;
    custom_text: string;
    logo_zoom: number;
    /** Vertical positions in mm from section top (0–74.25). When set, used by PDF engine. */
    logo_y_mm?: number;
    from_y_mm?: number;
    to_y_mm?: number;
    /** When true, normalize FROM/TO address text into tidy lines before rendering. */
    normalize_addresses?: boolean;
  } | null;
  logoBase64: string | null;
  /** Natural width / height of the logo image (for aspect-ratio-aware scaling). */
  logoAspectRatio: number | null;
};

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

/** Build a unique timestamped filename: Prefix_YYYYMMDD_HHMMSS.pdf */
function buildTimestampedFilename(prefix: string): string {
  const now = new Date();
  const YYYY = now.getFullYear();
  const MM = String(now.getMonth() + 1).padStart(2, "0");
  const DD = String(now.getDate()).padStart(2, "0");
  const HH = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  const SS = String(now.getSeconds()).padStart(2, "0");
  return `${prefix}_${YYYY}${MM}${DD}_${HH}${mm}${SS}.pdf`;
}

/** Force direct download to device: hidden <a download> with Blob URL (web & mobile browsers). */
function forceDownloadPdf(blob: Blob, filename: string): void {
  if (typeof window === "undefined") return;
  console.log(`[PDF] Starting download: ${filename}, size: ${blob.size} bytes`);
  const url = URL.createObjectURL(blob);
  console.log(`[PDF] Blob URL created: ${url.substring(0, 50)}...`);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  a.style.display = "none";
  document.body.appendChild(a);
  console.log(`[PDF] Anchor element created and appended, triggering click...`);
  // Use a direct click in the same user-gesture to avoid popup blockers.
  a.click();
  document.body.removeChild(a);
  console.log(`[PDF] Download triggered successfully`);
  // Delay revocation slightly so mobile browsers have time to start the download.
  setTimeout(() => {
    URL.revokeObjectURL(url);
    console.log(`[PDF] Blob URL revoked`);
  }, 500);
}

export async function savePdfBlob(
  blob: Blob,
  filename: string,
): Promise<string | null> {
  if (typeof window === "undefined") {
    console.warn("[PDF] savePdfBlob called in SSR context, skipping");
    return null;
  }
  try {
    forceDownloadPdf(blob, filename);
    return null;
  } catch (error) {
    console.error("[PDF] Download failed, using fallback:", error);
    const fallbackUrl = URL.createObjectURL(blob);
    window.location.href = fallbackUrl;
    return fallbackUrl;
  }
}

const DEFAULT_LOGO_PATHS = [
  "/logo.png",
  "/logo2.png",
  "/images/ssr-tex-emblem.png",
];
let defaultLogoCache: string | null | undefined;

/** Load default logo from public folder; returns base64 data URL or null. */
async function loadDefaultLogoBase64(): Promise<string | null> {
  if (defaultLogoCache !== undefined) return defaultLogoCache;
  if (typeof window === "undefined") return null;
  const origin = window.location.origin;

  const tryFetch = async (url: string): Promise<string | null> => {
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) return null;
      const blob = await res.blob();
      if (!blob.type.startsWith("image/") || blob.type.includes("svg")) {
        return null;
      }
      return await new Promise<string | null>((resolve) => {
        const r = new FileReader();
        r.onloadend = () =>
          resolve(typeof r.result === "string" ? r.result : null);
        r.onerror = () => resolve(null);
        r.readAsDataURL(blob);
      });
    } catch {
      return null;
    }
  };

  for (const path of DEFAULT_LOGO_PATHS) {
    const fromRoot = await tryFetch(path);
    if (fromRoot) {
      defaultLogoCache = fromRoot;
      return fromRoot;
    }
    if (origin) {
      const fromOrigin = await tryFetch(origin + path);
      if (fromOrigin) {
        defaultLogoCache = fromOrigin;
        return fromOrigin;
      }
    }
  }
  defaultLogoCache = null;
  return null;
}

async function getImageAspectRatio(base64: string): Promise<number | null> {
  if (typeof window === "undefined") return null;
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img.naturalWidth / (img.naturalHeight || 1));
    img.onerror = () => resolve(null);
    img.src = base64;
  });
}

/** Admin shop defaults — same A4 label layout as Software-Saree-order. */
async function fetchPdfSettingsForRendering(): Promise<PdfRenderOptions> {
  const logoBase64 = await loadDefaultLogoBase64();
  const logoAspectRatio = logoBase64
    ? await getImageAspectRatio(logoBase64)
    : null;
  return {
    settings: {
      content_type: logoBase64 ? "logo" : "text",
      placement: "top",
      text_size: 12,
      text_bold: true,
      custom_text: siteConfig.shortName,
      logo_zoom: 1,
      normalize_addresses: false,
    },
    logoBase64,
    logoAspectRatio,
  };
}

// A4: 210mm x 297mm. Four sections per page for parcel labels. Fixed values = same output on all devices.
const A4_W = 210;
const A4_H = 297;
const SECTIONS_PER_PAGE = 4;
const SECTION_H = A4_H / SECTIONS_PER_PAGE;
const MARGIN = 10;
const BASE_COL_W = (A4_W - MARGIN * 4) / 3;
/** Left/right +5mm each; center −10mm total — page width unchanged. */
const COL_SIDE_GAIN_MM = 5;
/** Reclaim mm from logo column for wider FROM/TO address areas. */
const LOGO_BOX_REDUCE_MM = 6;
const LEFT_COL_W = BASE_COL_W + COL_SIDE_GAIN_MM + LOGO_BOX_REDUCE_MM / 2;
const RIGHT_COL_W = BASE_COL_W + COL_SIDE_GAIN_MM + LOGO_BOX_REDUCE_MM / 2;
const CENTER_COL_W = BASE_COL_W - COL_SIDE_GAIN_MM * 2 - LOGO_BOX_REDUCE_MM;
const leftColStart = MARGIN;
const centerColStart = leftColStart + LEFT_COL_W + MARGIN;
const rightColStart = centerColStart + CENTER_COL_W + MARGIN;
const centerX = centerColStart + CENTER_COL_W / 2;

// Typography (Helvetica only = identical on Mobile, Android, Web)
const FONT_HEADING = "helvetica";
const FONT_BODY = "helvetica";
const SIZE_LABEL = 14; // TO / FROM labels — larger than address for emphasis
const SIZE_ADDRESS = 12; // address lines — larger and bold for print visibility
const SIZE_THANKS_TITLE = 10; // reduced for better balance
const SIZE_THANKS_SUB = 10;
const LINE_HEIGHT_ADDRESS = 6; // matches SIZE_ADDRESS for clean print
const MAX_ADDRESS_LINES = 7;

// Layout spacing
// ADDRESS_PADDING = distance from vertical border line to start of text inside a column.
// EDGE_SAFE_GAP   = extra gap from the *other* side so text stays away from the opposite border.
// With both set to 4mm, FROM/TO text always has a 4mm margin from left *and* right borders.
const ADDRESS_PADDING = 4; // 4mm from column border to text start
const EDGE_SAFE_GAP = 4; // 4mm from text end to opposite border
const VERTICAL_OFFSET = 4; // shift address blocks downward for balance
const THANKS_LINE_GAP = 3; // slightly increased gap between center lines
/** Minimum gap between center column edge and FROM/TO text (prevents column overlap). */
const MIN_GAP_TO_CENTER_MM = 2;

/** Remove blank lines (whitespace-only) from pasted/typed addresses before PDF render. */
export function stripEmptyAddressLines(text: string): string {
  return (text || "")
    .replace(/\r\n/g, "\n")
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .join("\n");
}

/** Max left shift for TO block so it never enters the center column. */
function getMaxToShiftMm(): number {
  const centerColEnd = centerColStart + CENTER_COL_W;
  const minToTextX = centerColEnd + MIN_GAP_TO_CENTER_MM;
  return Math.max(0, rightColStart + ADDRESS_PADDING - minToTextX);
}

function capToShiftMm(shift: number): number {
  return Math.min(Math.max(0, shift), getMaxToShiftMm());
}

/** Max text width (mm) for TO column after optional left shift toward logo. */
function getRightColumnMaxTextWidth(toShiftMm: number): number {
  const rightColStartShifted = rightColStart - toShiftMm;
  const rightTextStart = rightColStartShifted + ADDRESS_PADDING;
  const colInner = RIGHT_COL_W - ADDRESS_PADDING - EDGE_SAFE_GAP;
  const pageEdge = A4_W - MARGIN - EDGE_SAFE_GAP - rightTextStart;
  return Math.max(8, Math.min(colInner, pageEdge));
}

function getLeftColumnMaxTextWidth(): number {
  return LEFT_COL_W - ADDRESS_PADDING - EDGE_SAFE_GAP;
}

/** Break long unbroken tokens (e.g. Web order IDs) so jsPDF can wrap inside columns. */
function softBreakLongRuns(text: string, chunkSize = 14): string {
  return text
    .split(/(\s+)/)
    .map((part) => {
      if (part.trim().length === 0 || part.length <= chunkSize) return part;
      const chunks: string[] = [];
      for (let i = 0; i < part.length; i += chunkSize) {
        chunks.push(part.slice(i, i + chunkSize));
      }
      return chunks.join(" ");
    })
    .join("");
}

type SectionVerticalLayout = {
  fromY: number;
  toY: number;
  logoCenterYRel: number;
  fromLines: string[];
  toLines: string[];
  fits: boolean;
};

function getBaseTypographyPt(settings: PdfRenderOptions["settings"]): {
  labelPt: number;
  addressPt: number;
  centerPt: number;
} {
  const ts = settings?.text_size;
  if (ts != null) {
    return { labelPt: ts, addressPt: ts, centerPt: ts };
  }
  return { labelPt: SIZE_LABEL, addressPt: SIZE_ADDRESS, centerPt: 15 };
}

/** Wrap every line to column width, then cap line count without leaving overflow tokens. */
function fitAddressLinesToColumn(
  doc: { splitTextToSize: (s: string, w: number) => string[] },
  text: string,
  maxW: number,
  maxLines: number,
): string[] {
  const wrapped = getPdfAddressLines(doc, text, maxW);
  if (wrapped.length <= maxLines) return wrapped;

  const head = wrapped.slice(0, maxLines - 1);
  const tailSource = softBreakLongRuns(wrapped.slice(maxLines - 1).join(" "));
  const tailWrapped = doc.splitTextToSize(tailSource, maxW);
  const combined = [...head, ...tailWrapped];
  if (combined.length <= maxLines) return combined;

  const lastChunk = doc.splitTextToSize(tailSource, maxW)[0] ?? tailSource;
  return [...head, lastChunk];
}

/** Keep FROM/TO/logo inside one split vertically (shift only; never trim lines). */
export function layoutBlocksInSection(
  fromYBase: number,
  toYBase: number,
  logoCenterYRel: number,
  fromLinesIn: string[],
  toLinesIn: string[],
  lineHeightMm: number,
  labelToAddressGap: number,
  logoHalfH: number,
  centerBlockHalfH = 0,
): SectionVerticalLayout {
  const fromLines = [...fromLinesIn];
  const toLines = [...toLinesIn];
  const topLimit = VERTICAL_OFFSET;
  const bottomLimit = SECTION_H - VERTICAL_OFFSET;
  const effectiveLogoHalf = Math.max(logoHalfH, centerBlockHalfH);

  const blockBottom = (yBase: number, lineCount: number): number =>
    lineCount > 0
      ? yBase + labelToAddressGap + (lineCount - 1) * lineHeightMm
      : yBase;

  let fromY = fromYBase;
  let toY = toYBase;
  // Large logo box must stay inside section — clamp center Y before shifting text.
  let logoY = clamp(
    logoCenterYRel,
    topLimit + effectiveLogoHalf,
    bottomLimit - effectiveLogoHalf,
  );

  const measureBottoms = () => {
    const fromBottom = blockBottom(fromY, fromLines.length);
    const toBottom = blockBottom(toY, toLines.length);
    const logoBottom = logoY + effectiveLogoHalf;
    const maxBottom = Math.max(fromBottom, toBottom, logoBottom);
    return { fromBottom, toBottom, logoBottom, maxBottom };
  };

  let { maxBottom } = measureBottoms();

  if (maxBottom > bottomLimit) {
    const overflow = maxBottom - bottomLimit;
    const shiftUp = Math.min(
      overflow,
      Math.max(0, fromY - topLimit),
      Math.max(0, toY - topLimit),
      Math.max(0, logoY - (topLimit + effectiveLogoHalf)),
    );
    fromY -= shiftUp;
    toY -= shiftUp;
    logoY -= shiftUp;
    maxBottom = measureBottoms().maxBottom;
  }

  // Last resort: pin labels to top margin if a small nudge still overflows.
  if (maxBottom > bottomLimit && (fromY > topLimit || toY > topLimit)) {
    fromY = topLimit;
    toY = topLimit;
    maxBottom = measureBottoms().maxBottom;
  }

  const fits =
    maxBottom <= bottomLimit &&
    fromY >= topLimit &&
    toY >= topLimit &&
    logoY - effectiveLogoHalf >= topLimit;

  return { fromY, toY, logoCenterYRel: logoY, fromLines, toLines, fits };
}

function measureCenterBlockHalfH(
  doc: DocShape,
  options: PdfRenderOptions,
  centerTextSizePt: number,
): number {
  const contentType = options.settings?.content_type ?? "logo";
  const customText = (options.settings?.custom_text ?? "").trim();
  if (contentType === "text" && customText && doc.splitTextToSize) {
    const maxCenterW = CENTER_COL_W - 8;
    const centerLines = doc.splitTextToSize(customText, maxCenterW);
    const centerLh = centerTextSizePt * 0.4;
    return (centerLines.length * centerLh) / 2;
  }
  return LOGO_MAX_H_MM / 2;
}

function measureOrderSectionLayout(
  doc: DocShape,
  order: PdfLabelOrder,
  options: PdfRenderOptions,
  toShiftMm: number,
  labelSizePt: number,
  addressSizePt: number,
  centerTextSizePt: number,
): { fits: boolean; layout: SectionVerticalLayout; centerBlockHalfH: number } {
  const shouldNormalize = options.settings?.normalize_addresses === true;
  const fromSource = prepareAddressForPdf(
    order.sender_details ?? "",
    shouldNormalize,
  );
  const toSource = prepareAddressForPdf(
    order.recipient_details ?? "",
    shouldNormalize,
  );

  const maxWFrom = getLeftColumnMaxTextWidth();
  const maxWTo = getRightColumnMaxTextWidth(toShiftMm);

  const textBold = options.settings?.text_bold !== false;
  doc.setFont(FONT_BODY, textBold ? "bold" : "normal");
  doc.setFontSize(addressSizePt);

  const fromLines = fitAddressLinesToColumn(
    doc,
    fromSource,
    maxWFrom,
    MAX_ADDRESS_LINES,
  );
  const toLines = fitAddressLinesToColumn(
    doc,
    toSource,
    maxWTo,
    MAX_ADDRESS_LINES,
  );

  const sectionH = SECTION_H;
  /** Label baseline; first address line is +6 mm (default 8 → address starts at 14 mm). */
  const toYBase =
    options.settings?.to_y_mm != null
      ? clamp(options.settings.to_y_mm, 0, sectionH)
      : 8;
  const fromYBase =
    options.settings?.from_y_mm != null
      ? clamp(options.settings.from_y_mm, 0, sectionH)
      : 8;
  const placement = options.settings?.placement ?? "bottom";
  const logoYSetting =
    options.settings?.logo_y_mm != null
      ? clamp(options.settings.logo_y_mm, 0, sectionH)
      : null;
  const centerBlockHalfH = measureCenterBlockHalfH(
    doc,
    options,
    centerTextSizePt,
  );
  const logoHalfH = Math.max(LOGO_MAX_H_MM / 2, centerBlockHalfH);
  let logoCenterYRel =
    logoYSetting != null
      ? logoYSetting
      : placement === "top"
        ? 28
        : SECTION_H - 28;
  logoCenterYRel = clamp(
    logoCenterYRel,
    VERTICAL_OFFSET + logoHalfH,
    SECTION_H - VERTICAL_OFFSET - logoHalfH,
  );

  const lineHeightMm = addressSizePt * 0.5;
  const labelToAddressGap = 6;

  const layout = layoutBlocksInSection(
    fromYBase,
    toYBase,
    logoCenterYRel,
    fromLines,
    toLines,
    lineHeightMm,
    labelToAddressGap,
    LOGO_MAX_H_MM / 2,
    centerBlockHalfH,
  );

  return { fits: layout.fits, layout, centerBlockHalfH };
}

/** Shrink fonts in small steps until the label fits; otherwise ask user to shorten text. */
export function resolveOrderLabelLayout(
  doc: DocShape,
  order: PdfLabelOrder,
  options: PdfRenderOptions,
): ResolvedLabelLayout {
  const base = getBaseTypographyPt(options.settings);
  let labelPt = base.labelPt;
  let addressPt = base.addressPt;
  let centerPt = base.centerPt;

  while (labelPt >= PDF_MIN_LABEL_PT && addressPt >= PDF_MIN_ADDRESS_PT) {
    const toShift = computeToShiftMm(doc, order, options, addressPt);
    const measured = measureOrderSectionLayout(
      doc,
      order,
      options,
      toShift,
      labelPt,
      addressPt,
      Math.max(centerPt, PDF_MIN_CENTER_TEXT_PT),
    );

    if (measured.fits) {
      return {
        labelSizePt: labelPt,
        addressSizePt: addressPt,
        centerTextSizePt: Math.max(centerPt, PDF_MIN_CENTER_TEXT_PT),
        toShiftMm: toShift,
        fromY: measured.layout.fromY,
        toY: measured.layout.toY,
        logoCenterYRel: measured.layout.logoCenterYRel,
        fromLines: measured.layout.fromLines,
        toLines: measured.layout.toLines,
        centerBlockHalfH: measured.centerBlockHalfH,
      };
    }

    labelPt -= PDF_FONT_SHRINK_STEP_PT;
    addressPt -= PDF_FONT_SHRINK_STEP_PT;
    centerPt -= PDF_FONT_SHRINK_STEP_PT;
  }

  throw new PdfAddressTooLongError();
}

/** Split address by user newlines first, then wrap long lines to fit width. Skips empty lines. */
export function getPdfAddressLines(
  doc: { splitTextToSize: (s: string, w: number) => string[] },
  text: string,
  maxW: number,
): string[] {
  const raw = stripEmptyAddressLines(text);
  if (!raw) return ["-"];
  const paragraphs = raw.split(/\r?\n/);
  const lines: string[] = [];
  for (const p of paragraphs) {
    const trimmed = softBreakLongRuns(p.trim());
    if (!trimmed) continue;
    const wrapped = doc.splitTextToSize(trimmed, maxW);
    lines.push(...wrapped);
  }
  return lines.length > 0 ? lines : ["-"];
}

/** Preserve user-typed / pasted lines exactly (no auto-wrapping), only splitting on explicit newlines. */
function getAddressLinesPreserve(text: string): string[] {
  const raw = text || "-";
  return raw.replace(/\r\n/g, "\n").split("\n");
}

/** Normalize a free-form WhatsApp-style address into a tidy block (Name, door/street, area/city, state+PIN, phone). */
export function normalizeAddressBlock(text: string): string {
  const raw = text || "";
  const lines = raw
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((l) => l.trim().replace(/\s+/g, " "))
    .filter((l) => l.length > 0);

  if (!lines.length) return "";

  const nameCandidates: string[] = [];
  const doorLines: string[] = [];
  const cityAreaLines: string[] = [];
  const pinLines: string[] = [];
  const phoneLines: string[] = [];

  const phoneRegex = /\b[6-9]\d{9}\b/; // Indian-style mobile numbers
  const pinRegex = /\b\d{6}\b/; // 6-digit PIN
  const doorRegex =
    /^(door\s*no\.?|d\.?\s*no\.?|flat|apt|apartment|house|plot|no\.?|#|\d+)/i;

  for (const line of lines) {
    if (phoneRegex.test(line)) {
      phoneLines.push(line);
      continue;
    }
    if (pinRegex.test(line)) {
      pinLines.push(line);
      continue;
    }
    if (!nameCandidates.length) {
      nameCandidates.push(line);
      continue;
    }
    if (doorRegex.test(line)) {
      doorLines.push(line);
      continue;
    }
    cityAreaLines.push(line);
  }

  const result: string[] = [];

  if (nameCandidates.length) {
    result.push(nameCandidates[0]);
  }

  if (doorLines.length) {
    result.push(doorLines.join(", "));
  }

  if (cityAreaLines.length) {
    if (cityAreaLines.length === 1) {
      result.push(cityAreaLines[0]);
    } else {
      result.push(cityAreaLines[0]);
      result.push(cityAreaLines.slice(1).join(", "));
    }
  }

  if (pinLines.length) {
    const pinLine = pinLines.join(" ");
    const last = result[result.length - 1];
    if (!last || !pinRegex.test(last)) {
      result.push(pinLine);
    }
  }

  if (phoneLines.length) {
    result.push(phoneLines[0]);
  }

  // Hard cap: we never want to exceed MAX_ADDRESS_LINES logical lines; merge extras if needed.
  if (result.length > MAX_ADDRESS_LINES) {
    const head = result.slice(0, MAX_ADDRESS_LINES - 1);
    const tail = result.slice(MAX_ADDRESS_LINES - 1).join(", ");
    head.push(tail);
    return head.join("\n");
  }

  return result.join("\n");
}

/** Drop website order item lines (--- / Items: / product rows); keep name, address, Web #. */
function stripPdfItemDetails(text: string): string {
  const lines = text.split("\n");
  const kept: string[] = [];
  let inItemsSection = false;

  for (const line of lines) {
    const trim = line.trim();
    if (trim === "---" || /^Items:$/i.test(trim)) {
      inItemsSection = true;
      continue;
    }
    if (inItemsSection) {
      if (/^Web\s*#/i.test(trim)) {
        inItemsSection = false;
        kept.push(line);
      }
      continue;
    }
    kept.push(line);
  }

  return kept.join("\n");
}

/** Address text ready for PDF: strip empty lines, optionally normalize. */
export function prepareAddressForPdf(text: string, normalize: boolean): string {
  let stripped = stripEmptyAddressLines(text);
  if (!stripped) return "";
  stripped = stripPdfItemDetails(stripped)
    .split("\n")
    .map((line) =>
      line.replace(/^Web\s*#\s*(\S+)/i, (_match, id: string) => {
        const chunks = id.match(/.{1,12}/g) ?? [id];
        return `Web # ${chunks.join(" ")}`;
      }),
    )
    .join("\n");
  return normalize ? normalizeAddressBlock(stripped) : stripped;
}

// Square logo fills center column width (edge to edge of centre column)
const LOGO_MAX_W_MM = CENTER_COL_W;
const LOGO_MAX_H_MM = CENTER_COL_W;

/** Legacy cap; actual shift is limited by getMaxToShiftMm() (center column gap). */
const MAX_TO_SHIFT_MM = 20;
/** Shrink label/address by this much (pt) per step until layout fits. */
const PDF_FONT_SHRINK_STEP_PT = 0.5;
const PDF_MIN_LABEL_PT = 10;
const PDF_MIN_ADDRESS_PT = 9;
const PDF_MIN_CENTER_TEXT_PT = 9;

/** Thrown when address text cannot fit even at minimum PDF font size. */
export class PdfAddressTooLongError extends Error {
  readonly name = "PdfAddressTooLongError";

  constructor(
    message = "Address text is too long for the label. Please shorten the sender and/or recipient address, then try again.",
  ) {
    super(message);
  }
}

export type ResolvedLabelLayout = {
  labelSizePt: number;
  addressSizePt: number;
  centerTextSizePt: number;
  toShiftMm: number;
  fromY: number;
  toY: number;
  logoCenterYRel: number;
  fromLines: string[];
  toLines: string[];
  centerBlockHalfH: number;
};

type DocShape = {
  setFont: (f: string, s: string) => void;
  setFontSize: (n: number) => void;
  getTextWidth?: (s: string) => number;
  text: (s: string, x: number, y: number, o?: { align?: string }) => void;
  splitTextToSize: (s: string, w: number) => string[];
  setDrawColor: (r: number, g?: number, b?: number) => void;
  setFillColor: (r: number, g?: number, b?: number) => void;
  setTextColor: (r: number, g?: number, b?: number) => void;
  circle: (x: number, y: number, radius: number, style?: string) => void;
  addImage?: (
    imageData: string,
    format: string,
    x: number,
    y: number,
    w: number,
    h: number,
  ) => void;
  internal?: { write: (s: string) => void; scaleFactor: number };
};

/**
 * Compute how many mm the TO text block needs to shift left so no line
 * touches the right 4mm margin. Returns 0 when no shift is needed.
 */
function computeToShiftMm(
  doc: DocShape,
  order: PdfLabelOrder,
  options: PdfRenderOptions,
  addressSizePt: number,
): number {
  const shouldNormalize = options.settings?.normalize_addresses === true;
  const rawTo = order.recipient_details ?? "";
  const toSource = prepareAddressForPdf(rawTo, shouldNormalize);

  let toShift = 0;
  let toLines: string[] = [];
  for (let attempt = 0; attempt < 8; attempt++) {
    const maxWTo = getRightColumnMaxTextWidth(toShift);
    toLines = getPdfAddressLines(doc, toSource, maxWTo);
    const textBold = options.settings?.text_bold !== false;
    if (typeof doc.getTextWidth !== "function") return toShift;

    doc.setFont(FONT_BODY, textBold ? "bold" : "normal");
    doc.setFontSize(addressSizePt);

    let maxLineWidth = 0;
    for (const line of toLines) {
      maxLineWidth = Math.max(maxLineWidth, doc.getTextWidth(line));
    }
    if (maxLineWidth <= maxWTo - 0.25) return toShift;

    const overflow = maxLineWidth - (maxWTo - 0.25);
    const nextShift = capToShiftMm(toShift + overflow + 0.5);
    if (nextShift <= toShift) break;
    toShift = nextShift;
  }
  return toShift;
}

function drawOrderLabel(
  doc: DocShape,
  order: PdfLabelOrder,
  sectionTop: number,
  options: PdfRenderOptions,
  resolved: ResolvedLabelLayout,
) {
  const leftX = leftColStart + ADDRESS_PADDING;
  const rightColStartShifted = rightColStart - resolved.toShiftMm;
  const rightX = rightColStartShifted + ADDRESS_PADDING;

  const labelSize = resolved.labelSizePt;
  const addressSize = resolved.addressSizePt;
  const textBold = options.settings?.text_bold !== false;
  const lineHeightMm = resolved.addressSizePt * 0.5;
  const labelToAddressGap = 6;

  const fromLines = resolved.fromLines;
  const toLines = resolved.toLines;
  const thanksCenterY = sectionTop + resolved.logoCenterYRel;

  const labelYFrom = sectionTop + resolved.fromY;
  const addressStartYFrom = sectionTop + resolved.fromY + labelToAddressGap;
  const labelYTo = sectionTop + resolved.toY;
  const addressStartYTo = sectionTop + resolved.toY + labelToAddressGap;

  const contentType = options.settings?.content_type ?? "logo";
  const customText = (options.settings?.custom_text ?? "").trim();
  const textSize = resolved.centerTextSizePt;

  // FROM — left column (uses settings: text_size, text_bold)
  doc.setFont(FONT_HEADING, textBold ? "bold" : "normal");
  doc.setFontSize(labelSize);
  doc.text("FROM:", leftX, labelYFrom);
  doc.setFont(FONT_BODY, textBold ? "bold" : "normal");
  doc.setFontSize(addressSize);
  fromLines.forEach((line, i) => {
    doc.text(line, leftX, addressStartYFrom + i * lineHeightMm);
  });

  // Centre: logo or text at adjusted centerX / thanksCenterY
  if (contentType === "text" && customText && doc.splitTextToSize) {
    const textBoldInner = options.settings?.text_bold !== false;
    doc.setFont(FONT_BODY, textBoldInner ? "bold" : "normal");
    doc.setFontSize(textSize);
    const maxCenterW = CENTER_COL_W - 8;
    const lines = doc.splitTextToSize(customText, maxCenterW);
    const lineHeight = textSize * 0.4;
    const startY = thanksCenterY - (lines.length * lineHeight) / 2;
    lines.forEach((line, i) => {
      doc.text(line, centerX, startY + i * lineHeight, { align: "center" });
    });
  } else if (options.logoBase64 && doc.addImage) {
    const zoom = Math.max(0.5, Math.min(options.settings?.logo_zoom ?? 1, 2));
    const ar = options.logoAspectRatio ?? 1;

    // Scale logo to fit within the fixed container, preserving aspect ratio
    let fitW = LOGO_MAX_W_MM;
    let fitH = fitW / ar;
    if (fitH > LOGO_MAX_H_MM) {
      fitH = LOGO_MAX_H_MM;
      fitW = fitH * ar;
    }

    // Apply zoom (expand/shrink from centre point)
    const drawW = fitW * zoom;
    const drawH = fitH * zoom;

    // Slot rectangle for clipping (fixed container centred on thanksCenterY)
    const slotX = centerX - LOGO_MAX_W_MM / 2;
    const slotY = thanksCenterY - LOGO_MAX_H_MM / 2;
    const drawX = centerX - drawW / 2;
    const drawY = thanksCenterY - drawH / 2;

    const needsClip = drawW > LOGO_MAX_W_MM || drawH > LOGO_MAX_H_MM;

    if (needsClip && doc.internal) {
      const k = doc.internal.scaleFactor;
      doc.internal.write("q");
      const rx = slotX * k;
      const ry = (A4_H - slotY - LOGO_MAX_H_MM) * k;
      const rw = LOGO_MAX_W_MM * k;
      const rh = LOGO_MAX_H_MM * k;
      doc.internal.write(
        `${rx.toFixed(2)} ${ry.toFixed(2)} ${rw.toFixed(2)} ${rh.toFixed(2)} re W n`,
      );
    }

    doc.addImage(options.logoBase64, "PNG", drawX, drawY, drawW, drawH);

    if (needsClip && doc.internal) {
      doc.internal.write("Q");
    }
  }

  // TO — right column, left-aligned within its column
  doc.setFont(FONT_HEADING, textBold ? "bold" : "normal");
  doc.setFontSize(labelSize);
  doc.text("TO:", rightX, labelYTo);
  doc.setFont(FONT_BODY, textBold ? "bold" : "normal");
  doc.setFontSize(addressSize);
  const maxWToDraw = getRightColumnMaxTextWidth(resolved.toShiftMm);
  const safeToLines = fitAddressLinesToColumn(
    doc,
    toLines.join("\n"),
    maxWToDraw,
    MAX_ADDRESS_LINES,
  );
  safeToLines.forEach((line, i) => {
    doc.text(line, rightX, addressStartYTo + i * lineHeightMm);
  });
}

function drawSectionBorder(
  doc: {
    setDrawColor: (r: number, g?: number, b?: number) => void;
    setLineWidth: (w: number) => void;
    setLineDashPattern: (dashArray: number[], dashPhase: number) => void;
    line: (
      x1: number,
      y1: number,
      x2: number,
      y2: number,
      style?: string,
    ) => void;
  },
  sectionTop: number,
) {
  const left = MARGIN;
  const right = A4_W - MARGIN;
  const bottom = sectionTop + SECTION_H;

  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);

  // Solid left, top, right borders
  doc.setLineDashPattern([], 0);
  doc.line(left, sectionTop, left, bottom);
  doc.line(left, sectionTop, right, sectionTop);
  doc.line(right, sectionTop, right, bottom);

  // Dotted bottom line — "cut here" guide between orders
  doc.setLineDashPattern([2, 2], 0);
  doc.line(left, bottom, right, bottom);
  doc.setLineDashPattern([], 0); // restore solid for subsequent drawings
}

export async function downloadOrderPdf(order: PdfLabelOrder) {
  if (typeof window === "undefined") {
    console.warn("[PDF] downloadOrderPdf called in SSR context");
    return;
  }
  console.log(`[PDF] downloadOrderPdf called for order: ${order.id}`);

  try {
    const renderOptions = await fetchPdfSettingsForRendering();
    console.log(`[PDF] Creating jsPDF document...`);
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const d = doc as unknown as DocShape &
      Parameters<typeof drawSectionBorder>[0];
    const resolved = resolveOrderLabelLayout(d, order, renderOptions);
    console.log(
      `[PDF] Drawing ${SECTIONS_PER_PAGE} sections (TO shift: ${resolved.toShiftMm}mm, font: ${resolved.addressSizePt}pt)...`,
    );
    for (let i = 0; i < SECTIONS_PER_PAGE; i++) {
      drawSectionBorder(d, i * SECTION_H);
      drawOrderLabel(d, order, i * SECTION_H, renderOptions, resolved);
    }
    const filename = buildTimestampedFilename("SareeOrder");
    console.log(`[PDF] Generating blob for filename: ${filename}`);
    const blob = doc.output("blob");
    console.log(`[PDF] Blob generated, size: ${blob.size} bytes`);
    await savePdfBlob(blob, filename);
  } catch (e) {
    console.error("[PDF] downloadOrderPdf failed:", e);
    throw e; // Re-throw so caller can handle
  }
}

export async function downloadOrdersPdf(orders: PdfLabelOrder[]) {
  if (typeof window === "undefined") {
    console.warn("[PDF] downloadOrdersPdf called in SSR context");
    return;
  }
  if (orders.length === 0) {
    console.warn("[PDF] downloadOrdersPdf called with empty orders array");
    return;
  }
  console.log(`[PDF] downloadOrdersPdf called for ${orders.length} orders`);
  try {
    console.log(`[PDF] Creating jsPDF document...`);
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const d = doc as unknown as DocShape &
      Parameters<typeof drawSectionBorder>[0];
    let page = 0;
    let slot = 0;

    const renderOptions = await fetchPdfSettingsForRendering();

    const resolvedByOrder: ResolvedLabelLayout[] = [];
    for (const o of orders) {
      resolvedByOrder.push(resolveOrderLabelLayout(d, o, renderOptions));
    }

    console.log(`[PDF] Drawing ${orders.length} orders...`);
    for (let i = 0; i < orders.length; i++) {
      if (slot === 0 && page > 0) {
        console.log(`[PDF] Adding page ${page + 1}...`);
        doc.addPage([A4_W, A4_H], "p");
      }
      const sectionTop = slot * SECTION_H;
      drawSectionBorder(d, sectionTop);
      drawOrderLabel(
        d,
        orders[i],
        sectionTop,
        renderOptions,
        resolvedByOrder[i],
      );
      slot++;
      if (slot >= SECTIONS_PER_PAGE) {
        slot = 0;
        page++;
      }
    }

    while (slot > 0 && slot < SECTIONS_PER_PAGE) {
      drawSectionBorder(d, slot * SECTION_H);
      slot++;
    }

    const filename = buildTimestampedFilename("SareeOrders");
    console.log(`[PDF] Generating blob for filename: ${filename}`);
    const blob = doc.output("blob");
    console.log(
      `[PDF] Blob generated, size: ${blob.size} bytes, pages: ${page + 1}`,
    );
    await savePdfBlob(blob, filename);
  } catch (e) {
    console.error("[PDF] downloadOrdersPdf failed:", e);
    throw e; // Re-throw so caller can handle
  }
}
