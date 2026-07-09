"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import ImagePreviewCard from "@/features/medias/components/ImagePreviewCard";
import { ImagePlus, RefreshCw } from "lucide-react";
import React, { Suspense } from "react";
import UploadMediaContainer from "./UploadMediaContainer";

type ImageDialogProps = {
  onChange: (data: string) => void;
  defaultValue?: string;
  multiple?: boolean;
  modalOpen?: boolean;
  value?: string;
  selectLabel?: string;
  changeLabel?: string;
};

function ImageDialog({
  modalOpen = false,
  onChange,
  value,
  defaultValue,
  selectLabel = "Select image",
  changeLabel = "Change image",
}: ImageDialogProps) {
  const [dialogOpen, setDialogOpen] = React.useState(modalOpen);

  const onClickHandler = (mediaId: string) => {
    onChange(mediaId);
    setDialogOpen(false);
  };

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <div className="space-y-3">
        {value ? (
          <div className="max-w-[220px]">
            <ImagePreviewCard key={value} mediaId={value} />
          </div>
        ) : null}

        <DialogTrigger asChild>
          <Button
            type="button"
            variant="default"
            className="h-10 gap-2 px-4 font-medium"
          >
            {value ? (
              <RefreshCw className="h-4 w-4" aria-hidden />
            ) : (
              <ImagePlus className="h-4 w-4" aria-hidden />
            )}
            {value ? changeLabel : selectLabel}
          </Button>
        </DialogTrigger>
      </div>

      <DialogContent className="flex max-h-[90vh] max-w-[1080px] flex-col overflow-hidden sm:max-w-[1080px]">
        <DialogHeader className="shrink-0">
          <DialogTitle>Image gallery</DialogTitle>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-hidden">
          <Suspense>
            <UploadMediaContainer
              onClickItemsHandler={onClickHandler}
              defaultImageId={defaultValue}
            />
          </Suspense>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default ImageDialog;
