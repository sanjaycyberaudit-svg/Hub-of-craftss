import { getCanonicalSiteBaseUrl } from "@/lib/auth/site-urls";
import { env } from "@/env.mjs";
import { clsx, type ClassValue } from "clsx";
import dayjs from "dayjs";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const getURL = () => {
  const envUrl = env.NEXT_PUBLIC_SITE_URL?.trim();
  if (envUrl?.includes("localhost")) {
    const normalized = envUrl.includes("http") ? envUrl : `http://${envUrl}`;
    return normalized.endsWith("/") ? normalized : `${normalized}/`;
  }

  return getCanonicalSiteBaseUrl();
};

const DEMO_S3_BUCKET = "hiyori-backpack";
const DEMO_S3_REGION = "us-west-2";

/** Public bucket for Sakthi product/collection photos (Supabase Storage). */
export const SUPABASE_MEDIA_BUCKET = "media";

export function supabaseStoragePublicUrl(storagePath: string) {
  const base = env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/, "");
  return `${base}/storage/v1/object/public/${SUPABASE_MEDIA_BUCKET}/${storagePath}`;
}

export function r2PublicUrl(key: string) {
  const base = env.NEXT_PUBLIC_CDN_URL.replace(/\/$/, "");
  return `${base}/${key.replace(/^\//, "")}`;
}

import {
  DEFAULT_SAREE_PLACEHOLDER,
  collectionPlaceholderImage,
} from "@/lib/supabase/seedData/collectionPlaceholders";

export const keytoUrl = (key?: string) => {
  if (!key) {
    return DEFAULT_SAREE_PLACEHOLDER;
  }

  if (key.startsWith("http://") || key.startsWith("https://")) {
    return key;
  }

  if (key.startsWith("sakthi/")) {
    return supabaseStoragePublicUrl(key);
  }

  if (env.NEXT_PUBLIC_CDN_URL) {
    return r2PublicUrl(key);
  }

  const bucket =
    env.NEXT_PUBLIC_S3_BUCKET === "placeholder"
      ? DEMO_S3_BUCKET
      : env.NEXT_PUBLIC_S3_BUCKET;
  const region =
    env.NEXT_PUBLIC_S3_BUCKET === "placeholder"
      ? DEMO_S3_REGION
      : env.NEXT_PUBLIC_S3_REGION;

  return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
};

/** Store currency — Indian Rupee (₹) */
export const STORE_CURRENCY = "INR" as const;

export function formatPrice(
  price: number | string,
  currency: string = STORE_CURRENCY,
) {
  const isInr = currency === "INR";
  return new Intl.NumberFormat(isInr ? "en-IN" : "en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: isInr ? 0 : 2,
  }).format(Number(price));
}

/** Alias for rupee formatting (same as formatPrice) */
export function formatInr(price: number | string) {
  return formatPrice(price, STORE_CURRENCY);
}

export function formatDate(date: Date | string) {
  return dayjs(date).format("MMMM D, YYYY");
}

export function formatBytes(
  bytes: number,
  decimals = 0,
  sizeType: "accurate" | "normal" = "normal",
) {
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const accurateSizes = ["Bytes", "KiB", "MiB", "GiB", "TiB"];
  if (bytes === 0) return "0 Byte";
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(decimals)} ${
    sizeType === "accurate" ? accurateSizes[i] ?? "Bytest" : sizes[i] ?? "Bytes"
  }`;
}

export function slugify(str: string) {
  return str
    .toLowerCase()
    .replace(/ /g, "-")
    .replace(/[^\w-]+/g, "")
    .replace(/--+/g, "-");
}

export function unslugify(str: string) {
  return str.replace(/-/g, " ");
}

export function toTitleCase(str: string) {
  return str.replace(
    /\w\S*/g,
    (txt) => txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase(),
  );
}

export function toSentenceCase(str: string) {
  return str
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (str) => str.toUpperCase());
}

export function isArrayOfFile(files: unknown): files is File[] {
  const isArray = Array.isArray(files);
  if (!isArray) return false;
  return files.every((file) => file instanceof File);
}

export function getNameInitials(fullName: string): string {
  const nameParts = fullName.split(" ");
  let initials = "";

  for (const part of nameParts) {
    if (part.length > 0) {
      initials += part[0].toUpperCase();
    }
  }

  return initials;
}
