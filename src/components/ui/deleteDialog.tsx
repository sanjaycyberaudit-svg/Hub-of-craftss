"use client";
import React from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "./button";

type DeleteDialogProps = {
  onClickHandler: (e: React.MouseEvent<HTMLButtonElement>) => void;
  triggerLabel?: string;
  title?: string;
  description?: string;
  cancelLabel?: string;
  actionLabel?: string;
  /** Disables trigger + confirm while a delete is in progress. */
  isPending?: boolean;
  pendingLabel?: string;
};

function DeleteDialog({
  onClickHandler,
  title,
  description,
  triggerLabel,
  actionLabel,
  cancelLabel,
  isPending = false,
  pendingLabel = "Deleting…",
}: DeleteDialogProps) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" disabled={isPending}>
          {isPending ? pendingLabel : triggerLabel || "Delete"}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {title || "Are you absolutely sure?"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {description ||
              "This action cannot be undone. This will permanently delete your account and remove your data from our servers."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>
            {cancelLabel || "Cancel"}
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={isPending}
            onClick={(e) => {
              if (isPending) {
                e.preventDefault();
                return;
              }
              onClickHandler(e);
            }}
          >
            {isPending ? pendingLabel : actionLabel || "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default DeleteDialog;
