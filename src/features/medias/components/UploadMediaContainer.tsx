"use client";
import { Icons } from "@/components/layouts/icons";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/components/ui/use-toast";
import { gql } from "@/gql";
import {
  UPLOAD_LIMIT_BYTES,
  uploadMediaFilesQueue,
} from "@/lib/admin/client-image-upload";
import { FileWithPreview } from "@/types";
import { useQuery } from "@urql/next";
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

const GALLERY_PAGE_SIZE = 40;

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

  const [pageCursor, setPageCursor] = useState<string | undefined>(undefined);
  const [accumulatedEdges, setAccumulatedEdges] = useState<MediaEdge[]>([]);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const pendingCursorRef = useRef<string | null>(null);

  const [{ data, fetching, error }, refetch] = useQuery({
    query: MediasPageContentQuery,
    variables: {
      first: GALLERY_PAGE_SIZE,
      after: pageCursor,
    },
  });

  const medias = data?.mediasCollection;
  const isInitialLoading = fetching && accumulatedEdges.length === 0;

  const resetGallery = useCallback(() => {
    pendingCursorRef.current = null;
    setPageCursor(undefined);
    setAccumulatedEdges([]);
    setHasNextPage(false);
    setIsLoadingMore(false);
  }, []);

  useEffect(() => {
    if (!medias) return;

    setHasNextPage(Boolean(medias.pageInfo.hasNextPage));

    setAccumulatedEdges((prev) => {
      const incoming = medias.edges as MediaEdge[];
      if (pageCursor === undefined) {
        return incoming;
      }

      const existingIds = new Set(prev.map((edge) => edge.node.id));
      const merged = [...prev];
      incoming.forEach((edge) => {
        if (!existingIds.has(edge.node.id)) {
          merged.push(edge);
        }
      });
      return merged;
    });

    setIsLoadingMore(false);
    pendingCursorRef.current = null;
  }, [medias, pageCursor]);

  const loadMore = useCallback(() => {
    if (
      !medias?.pageInfo.hasNextPage ||
      fetching ||
      isLoadingMore ||
      pendingCursorRef.current
    ) {
      return;
    }

    const nextCursor = medias.pageInfo.endCursor;
    if (!nextCursor) return;

    pendingCursorRef.current = nextCursor;
    setIsLoadingMore(true);
    setPageCursor(nextCursor);
  }, [fetching, isLoadingMore, medias]);

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
      });

      const uploadedNames = new Set(result.uploadedNames);
      if (uploadedNames.size > 0) {
        resetGallery();
        refetch({ requestPolicy: "network-only" });
        setUploadingImages((prev) =>
          prev.filter((item) => !uploadedNames.has(item.name)),
        );
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

  return (
    <div className="flex min-h-0 flex-col">
      {error ? (
        <p className="mb-2 text-sm text-destructive">Could not load images.</p>
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
            disabled={fetching || isLoadingMore}
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
                {isLoadingMore || fetching ? (
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

export const MediasPageContentQuery = gql(/* GraphQL */ `
  query MediasPageContentQuery($first: Int, $after: Cursor) {
    mediasCollection(
      first: $first
      after: $after
      orderBy: [{ created_at: DescNullsLast }]
    ) {
      __typename
      edges {
        node {
          id
          key
          alt
        }
      }
      pageInfo {
        hasNextPage
        hasPreviousPage
        endCursor
      }
    }
  }
`);
