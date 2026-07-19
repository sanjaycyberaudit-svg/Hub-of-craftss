"use client";
import { Icons } from "@/components/layouts/icons";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/components/ui/use-toast";
import {
  UPLOAD_LIMIT_BYTES,
  uploadFileIdentityKey,
  uploadMediaFilesQueue,
} from "@/lib/admin/client-image-upload";
import { fetchWithTimeout } from "@/lib/network/fetchWithTimeout";
import { FileWithPreview } from "@/types";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { FileWithPath, useDropzone } from "react-dropzone";
import ImagesGrid from "./ImageGrid";
import ImageGridSkeleton from "./ImageGridSkeleton";

interface UploadMediaContainerProps {
  onClickItemsHandler: (mediaId: string) => void;
  defaultImageId?: string;
  selectedImageIds?: string[];
}

type MediaEdge = {
  node: {
    id: string;
    key: string;
    alt: string;
  };
};

const GALLERY_PAGE_SIZE = 48;
const GALLERY_CACHE_TTL_MS = 5 * 60 * 1000;

type GalleryCache = {
  edges: MediaEdge[];
  page: number;
  hasNextPage: boolean;
  fetchedAt: number;
};

/** Survives dialog remounts so the picker opens instantly on reopen. */
let productGalleryCache: GalleryCache | null = null;

function readGalleryCache(): GalleryCache | null {
  if (!productGalleryCache) return null;
  if (Date.now() - productGalleryCache.fetchedAt > GALLERY_CACHE_TTL_MS) {
    return null;
  }
  return productGalleryCache;
}

function writeGalleryCache(cache: Omit<GalleryCache, "fetchedAt">) {
  productGalleryCache = { ...cache, fetchedAt: Date.now() };
}

function clearGalleryCache() {
  productGalleryCache = null;
}

function UploadMediaContainer({
  onClickItemsHandler,
  defaultImageId,
  selectedImageIds,
}: UploadMediaContainerProps) {
  const { toast } = useToast();
  const [uploadingImages, setUploadingImages] = useState<FileWithPreview[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const previewUrlsRef = useRef<string[]>([]);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const loadMoreSentinelRef = useRef<HTMLDivElement | null>(null);

  const cached = readGalleryCache();
  const [page, setPage] = useState(cached?.page ?? 1);
  const [accumulatedEdges, setAccumulatedEdges] = useState<MediaEdge[]>(
    cached?.edges ?? [],
  );
  const [hasNextPage, setHasNextPage] = useState(cached?.hasNextPage ?? false);
  const [isLoading, setIsLoading] = useState(!cached);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const loadInFlightRef = useRef(false);

  const removeUploadingPreviews = useCallback((files: File[]) => {
    if (files.length === 0) return;
    const keys = new Set(files.map(uploadFileIdentityKey));
    setUploadingImages((prev) => {
      const kept: FileWithPreview[] = [];
      for (const item of prev) {
        if (keys.has(uploadFileIdentityKey(item))) {
          URL.revokeObjectURL(item.preview);
          previewUrlsRef.current = previewUrlsRef.current.filter(
            (url) => url !== item.preview,
          );
        } else {
          kept.push(item);
        }
      }
      return kept;
    });
  }, []);

  const loadLibrary = useCallback(
    async (options?: {
      page?: number;
      reset?: boolean;
      /** Refresh without showing the full-page “Loading gallery...” skeleton. */
      soft?: boolean;
    }) => {
      const targetPage = options?.page ?? 1;
      const reset = options?.reset ?? targetPage === 1;
      const soft = Boolean(options?.soft);
      if (loadInFlightRef.current && !reset) return;
      loadInFlightRef.current = true;

      if (reset && !soft) {
        setIsLoading(true);
        setLoadError(null);
      } else if (!reset) {
        setIsLoadingMore(true);
      }

      try {
        const params = new URLSearchParams({
          page: String(targetPage),
          limit: String(GALLERY_PAGE_SIZE),
          section: "product",
          _t: String(Date.now()),
        });
        const res = await fetchWithTimeout(
          `/api/admin/medias/library?${params.toString()}`,
          { cache: "no-store", credentials: "same-origin" },
        );
        if (!res.ok) {
          throw new Error("Could not load media library.");
        }

        const payload = (await res.json()) as {
          medias: { id: string; key: string; alt: string }[];
          pageInfo: { page: number; hasNextPage: boolean };
        };

        const edges: MediaEdge[] = (payload.medias ?? []).map((media) => ({
          node: {
            id: media.id,
            key: media.key,
            alt: media.alt,
          },
        }));

        const nextPage = payload.pageInfo?.page ?? targetPage;
        const nextHasMore = Boolean(payload.pageInfo?.hasNextPage);

        setPage(nextPage);
        setHasNextPage(nextHasMore);
        setAccumulatedEdges((prev) => {
          if (reset) {
            writeGalleryCache({
              edges,
              page: nextPage,
              hasNextPage: nextHasMore,
            });
            return edges;
          }
          const seen = new Set(prev.map((edge) => edge.node.id));
          const merged = [...prev];
          for (const edge of edges) {
            if (!seen.has(edge.node.id)) merged.push(edge);
          }
          writeGalleryCache({
            edges: merged,
            page: nextPage,
            hasNextPage: nextHasMore,
          });
          return merged;
        });
        setLoadError(null);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Could not load images.";
        setLoadError(message);
        if (reset && !soft) setAccumulatedEdges([]);
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
        loadInFlightRef.current = false;
      }
    },
    [],
  );

  useEffect(() => {
    // Instant open from cache; soft-refresh in background so list stays fresh.
    void loadLibrary({
      reset: true,
      page: 1,
      soft: Boolean(readGalleryCache()),
    });
  }, [loadLibrary]);

  const loadMore = useCallback(() => {
    if (!hasNextPage || isLoading || isLoadingMore || loadInFlightRef.current) {
      return;
    }
    void loadLibrary({ page: page + 1, reset: false });
  }, [hasNextPage, isLoading, isLoadingMore, loadLibrary, page]);

  useEffect(() => {
    const root = scrollRef.current;
    const sentinel = loadMoreSentinelRef.current;
    if (!root || !sentinel || !hasNextPage) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          loadMore();
        }
      },
      { root, rootMargin: "160px", threshold: 0.1 },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasNextPage, loadMore, accumulatedEdges.length]);

  const onDrop = async (acceptedFiles: FileWithPath[]) => {
    if (acceptedFiles.length === 0 || isUploading) return;

    const uploadFiles = acceptedFiles.map((file) =>
      Object.assign(file, {
        preview: URL.createObjectURL(file),
      }),
    );
    previewUrlsRef.current.push(...uploadFiles.map((file) => file.preview));

    setUploadingImages((prev) => [...prev, ...uploadFiles]);
    setIsUploading(true);
    setUploadMessage(`Uploading 0/${acceptedFiles.length}...`);

    try {
      const result = await uploadMediaFilesQueue(acceptedFiles, {
        onProgress: (update) => {
          setUploadMessage(update.message);
        },
        onFileUploaded: (sourceFile, ok) => {
          if (ok) removeUploadingPreviews([sourceFile]);
        },
        preferDirectUpload: true,
      });

      removeUploadingPreviews(acceptedFiles);

      if (result.uploadedCount > 0) {
        clearGalleryCache();
        await loadLibrary({ reset: true, page: 1, soft: false });
      }

      const issueCount =
        result.validationErrors.length + result.failures.length;

      if (result.uploadedCount > 0) {
        toast({
          title: "Upload complete",
          description:
            issueCount > 0
              ? `${result.uploadedCount} uploaded, ${issueCount} failed or skipped.`
              : `${result.uploadedCount} image(s) uploaded.`,
        });
      } else {
        toast({
          title: "Upload failed",
          description:
            result.validationErrors[0]?.reason ??
            result.failures[0]?.reason ??
            "No images were uploaded.",
          variant: "destructive",
        });
      }

      if (issueCount > 0) {
        console.warn("[media-picker-upload] issues:", [
          ...result.validationErrors.map((entry) => entry.reason),
          ...result.failures.map((entry) => entry.reason),
        ]);
      }
    } catch (uploadError) {
      toast({
        title: "Upload failed",
        description:
          uploadError instanceof Error ? uploadError.message : "Please retry.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      setUploadMessage(null);
    }
  };

  useEffect(() => {
    return () => {
      previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      previewUrlsRef.current = [];
    };
  }, []);

  const { getRootProps, getInputProps, open, isDragActive } = useDropzone({
    accept: { "image/*": [] },
    maxSize: UPLOAD_LIMIT_BYTES,
    multiple: true,
    disabled: isUploading,
    onDrop,
    noClick: true,
    noKeyboard: true,
  });

  const isInitialLoading = isLoading && accumulatedEdges.length === 0;

  return (
    <div className="flex min-h-0 flex-col">
      {loadError ? (
        <p className="mb-2 text-sm text-destructive">{loadError}</p>
      ) : null}

      {uploadMessage ? (
        <p className="mb-2 text-xs text-muted-foreground">{uploadMessage}</p>
      ) : null}

      <div className="mb-2 flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>
          {accumulatedEdges.length > 0
            ? `${accumulatedEdges.length} image(s) loaded`
            : "Loading gallery..."}
        </span>
        {hasNextPage ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            disabled={isLoading || isLoadingMore}
            onClick={loadMore}
          >
            Load more
          </Button>
        ) : null}
      </div>

      <div
        ref={scrollRef}
        className="admin-scroll max-h-[min(62vh,560px)] overflow-y-auto overscroll-contain rounded-md border border-zinc-300 p-4"
      >
        {isInitialLoading ? <ImageGridSkeleton /> : null}

        {!isInitialLoading ? (
          <div {...getRootProps()} className="dropzone-container relative">
            <ImagesGrid
              medias={accumulatedEdges}
              AddMediaButtonComponent={
                <AddMediaButtonComponent open={open} disabled={isUploading} />
              }
              uploadingFiles={uploadingImages}
              onClickHandler={onClickItemsHandler}
              defaultImageId={defaultImageId}
              selectedImageIds={selectedImageIds}
            />

            {hasNextPage ? (
              <div
                ref={loadMoreSentinelRef}
                className="flex justify-center py-4"
              >
                {isLoadingMore || isLoading ? (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Spinner />
                    Loading more...
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={loadMore}
                  >
                    Load more images
                  </Button>
                )}
              </div>
            ) : null}

            <input {...getInputProps()} />
            {isDragActive ? (
              <div className="absolute inset-0 z-50 flex min-h-[240px] items-center justify-center rounded-md bg-background/80">
                Drop images here to upload.
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

const AddMediaButtonComponent = ({
  open,
  disabled,
}: {
  open: () => void;
  disabled?: boolean;
}) => {
  return (
    <button
      type="button"
      onClick={open}
      disabled={disabled}
      className="flex h-[120px] w-[120px] flex-col items-center justify-center border-2 border-dashed border-zinc-400 text-zinc-400 disabled:opacity-50"
    >
      <Icons.add size={32} />
    </button>
  );
};

export default UploadMediaContainer;
