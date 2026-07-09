"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AddAddressForm } from "./AddAddressForm";
import type { AddressFormValues } from "../validations/addressFormSchema";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: AddressFormValues) => Promise<void>;
  submitLabel?: string;
  defaultValues?: Partial<AddressFormValues>;
  persistDraft?: boolean;
  checkoutQuantity?: number;
  title?: string;
};

export function AddAddressDialog({
  open,
  onOpenChange,
  onSubmit,
  submitLabel,
  defaultValues,
  persistDraft = false,
  checkoutQuantity = 1,
  title = "Add New Address",
}: Props) {
  const handleSubmit = async (values: AddressFormValues) => {
    try {
      await onSubmit(values);
      onOpenChange(false);
    } catch {
      /* Parent shows toast; keep dialog open for corrections */
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="left-0 top-0 z-[190] flex h-[100dvh] max-h-[100dvh] w-screen max-w-none translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-none border-0 p-0 sm:left-1/2 sm:top-1/2 sm:h-auto sm:max-h-[min(90dvh,860px)] sm:w-[min(92vw,780px)] sm:max-w-[780px] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-xl sm:border">
        <DialogHeader className="sticky top-0 z-10 border-b bg-background/95 px-4 py-3 text-left backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:px-6 sm:py-4">
          <DialogTitle className="text-lg font-semibold sm:text-xl">
            {title}
          </DialogTitle>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-3 sm:px-6 sm:py-4">
          <AddAddressForm
            onSubmit={handleSubmit}
            onCancel={() => onOpenChange(false)}
            submitLabel={submitLabel}
            defaultValues={defaultValues}
            persistDraft={persistDraft}
            dialogOpen={open}
            checkoutQuantity={checkoutQuantity}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default AddAddressDialog;
