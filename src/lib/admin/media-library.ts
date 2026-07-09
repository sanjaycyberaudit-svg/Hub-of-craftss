import db from "@/lib/supabase/db";
import {
  apiSettings,
  collections,
  medias,
  productMedias,
  products,
  testimonials,
} from "@/lib/supabase/schema";
import {
  and,
  count,
  desc,
  eq,
  inArray,
  isNotNull,
  notInArray,
} from "drizzle-orm";
import { unstable_cache, revalidateTag } from "next/cache";

export const ADMIN_MEDIA_PAGE_SIZE = 48;
export const ADMIN_MEDIA_CACHE_SECONDS = 60;

export type MediaSection = "banner" | "product";

export type MediaUsageSummary = {
  bannerSlideCount: number;
  productCount: number;
  collectionCount: number;
  testimonialCount: number;
};

export type MediaLibraryRow = {
  id: string;
  key: string;
  alt: string;
  createdAt: string | null;
  section: MediaSection;
  usage: MediaUsageSummary;
};

export function parseBannerMediaIds(settingValue: unknown): Set<string> {
  const value = (settingValue ?? {}) as Record<string, unknown>;
  const slides = Array.isArray(value.slides) ? value.slides : [];
  const ids = slides
    .map((slide) =>
      String((slide as Record<string, unknown>).imageMediaId ?? "").trim(),
    )
    .filter(Boolean);
  return new Set(ids);
}

const getBannerMediaIdsCached = unstable_cache(
  async () => {
    const bannerSetting = await db.query.apiSettings.findFirst({
      where: eq(apiSettings.key, "home_banner_slides"),
    });
    return [...parseBannerMediaIds(bannerSetting?.value)];
  },
  ["admin-media-banner-ids"],
  { revalidate: ADMIN_MEDIA_CACHE_SECONDS, tags: ["admin-media-library"] },
);

export async function getMediaSectionCounts() {
  const bannerIds = await getBannerMediaIdsCached();
  const [totalRow] = await db.select({ value: count() }).from(medias);
  const total = Number(totalRow?.value ?? 0);

  if (bannerIds.length === 0) {
    return { total, banner: 0, product: total };
  }

  const [bannerRow] = await db
    .select({ value: count() })
    .from(medias)
    .where(inArray(medias.id, bannerIds));

  const banner = Number(bannerRow?.value ?? 0);
  return { total, banner, product: Math.max(0, total - banner) };
}

async function loadUsageForMediaIds(
  mediaIds: string[],
  bannerIds: Set<string>,
) {
  const usageByMedia = new Map<
    string,
    MediaUsageSummary & { productIds: string[]; section: MediaSection }
  >();

  if (mediaIds.length === 0) {
    return usageByMedia;
  }

  const bannerSlideCountMap = new Map<string, number>();

  const bannerSetting = await db.query.apiSettings.findFirst({
    where: eq(apiSettings.key, "home_banner_slides"),
  });
  const slides = Array.isArray(
    (bannerSetting?.value as Record<string, unknown>)?.slides,
  )
    ? ((bannerSetting?.value as Record<string, unknown>).slides as unknown[]) ??
      []
    : [];
  for (const slide of slides) {
    const id = String(
      (slide as Record<string, unknown>).imageMediaId ?? "",
    ).trim();
    if (!id || !mediaIds.includes(id)) continue;
    bannerSlideCountMap.set(id, (bannerSlideCountMap.get(id) ?? 0) + 1);
  }

  const [productRows, productMediaRows, collectionRows, testimonialRows] =
    await Promise.all([
      db
        .select({ productId: products.id, mediaId: products.featuredImageId })
        .from(products)
        .where(inArray(products.featuredImageId, mediaIds)),
      db
        .select({
          productId: productMedias.productId,
          mediaId: productMedias.mediaId,
        })
        .from(productMedias)
        .where(inArray(productMedias.mediaId, mediaIds)),
      db
        .select({ mediaId: collections.featuredImageId })
        .from(collections)
        .where(inArray(collections.featuredImageId, mediaIds)),
      db
        .select({ mediaId: testimonials.featuredImageId })
        .from(testimonials)
        .where(
          and(
            isNotNull(testimonials.featuredImageId),
            inArray(testimonials.featuredImageId, mediaIds),
          ),
        ),
    ]);

  const productIdsByMedia = new Map<string, Set<string>>();
  for (const row of productRows) {
    const set = productIdsByMedia.get(row.mediaId) ?? new Set<string>();
    set.add(row.productId);
    productIdsByMedia.set(row.mediaId, set);
  }
  for (const row of productMediaRows) {
    const set = productIdsByMedia.get(row.mediaId) ?? new Set<string>();
    set.add(row.productId);
    productIdsByMedia.set(row.mediaId, set);
  }

  const collectionCountMap = new Map<string, number>();
  for (const row of collectionRows) {
    collectionCountMap.set(
      row.mediaId,
      (collectionCountMap.get(row.mediaId) ?? 0) + 1,
    );
  }

  const testimonialCountMap = new Map<string, number>();
  for (const row of testimonialRows) {
    if (!row.mediaId) continue;
    testimonialCountMap.set(
      row.mediaId,
      (testimonialCountMap.get(row.mediaId) ?? 0) + 1,
    );
  }

  for (const mediaId of mediaIds) {
    const productIds = [
      ...(productIdsByMedia.get(mediaId) ?? new Set<string>()),
    ];
    usageByMedia.set(mediaId, {
      bannerSlideCount: bannerSlideCountMap.get(mediaId) ?? 0,
      productCount: productIds.length,
      collectionCount: collectionCountMap.get(mediaId) ?? 0,
      testimonialCount: testimonialCountMap.get(mediaId) ?? 0,
      productIds,
      section: bannerIds.has(mediaId) ? "banner" : "product",
    });
  }

  return usageByMedia;
}

export async function fetchMediaLibraryPage(params: {
  page: number;
  limit: number;
  section: MediaSection;
}) {
  const page = Math.max(1, params.page);
  const limit = Math.min(ADMIN_MEDIA_PAGE_SIZE, Math.max(12, params.limit));
  const offset = (page - 1) * limit;

  const bannerIdList = await getBannerMediaIdsCached();
  const bannerIds = new Set(bannerIdList);
  const counts = await getMediaSectionCounts();
  const sectionTotal =
    params.section === "banner" ? counts.banner : counts.product;

  if (sectionTotal === 0) {
    return {
      medias: [] as MediaLibraryRow[],
      pageInfo: {
        page,
        limit,
        total: 0,
        totalPages: 0,
        hasNextPage: false,
      },
      counts,
    };
  }

  const sectionFilter =
    params.section === "banner"
      ? bannerIdList.length > 0
        ? inArray(medias.id, bannerIdList)
        : eq(medias.id, "__none__")
      : bannerIdList.length > 0
        ? notInArray(medias.id, bannerIdList)
        : undefined;

  const mediaRows = await db
    .select({
      id: medias.id,
      key: medias.key,
      alt: medias.alt,
      createdAt: medias.createdAt,
    })
    .from(medias)
    .where(sectionFilter)
    .orderBy(desc(medias.createdAt))
    .limit(limit)
    .offset(offset);

  const mediaIds = mediaRows.map((row) => row.id);
  const usageByMedia = await loadUsageForMediaIds(mediaIds, bannerIds);

  const totalPages = Math.ceil(sectionTotal / limit);

  return {
    medias: mediaRows.map((row) => {
      const usage = usageByMedia.get(row.id);
      return {
        ...row,
        createdAt: row.createdAt ?? "",
        section: usage?.section ?? "product",
        usage: {
          bannerSlideCount: usage?.bannerSlideCount ?? 0,
          productCount: usage?.productCount ?? 0,
          collectionCount: usage?.collectionCount ?? 0,
          testimonialCount: usage?.testimonialCount ?? 0,
        },
      };
    }),
    pageInfo: {
      page,
      limit,
      total: sectionTotal,
      totalPages,
      hasNextPage: page < totalPages,
    },
    counts,
  };
}

/** Full usage map for delete validation (batch by media ids). */
export async function loadMediaUsageForDelete(mediaIds: string[]) {
  const bannerIdList = await getBannerMediaIdsCached();
  const bannerIds = new Set(bannerIdList);
  const usageByMedia = await loadUsageForMediaIds(mediaIds, bannerIds);

  const bannerSetting = await db.query.apiSettings.findFirst({
    where: eq(apiSettings.key, "home_banner_slides"),
  });

  return {
    usageByMedia,
    bannerSetting,
    bannerIds,
  };
}

export function invalidateAdminMediaCache() {
  revalidateTag("admin-media-library");
}
