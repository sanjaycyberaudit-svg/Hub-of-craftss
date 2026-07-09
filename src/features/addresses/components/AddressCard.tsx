"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { UserAddressRecord } from "../lib/userAddress";
import { formatAddressLines } from "../lib/userAddress";

type Props = {
  address: UserAddressRecord;
  selected?: boolean;
  selectable?: boolean;
  onSelect?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onSetDefault?: () => void;
  showActions?: boolean;
};

export function AddressCard({
  address,
  selected = false,
  selectable = false,
  onSelect,
  onEdit,
  onDelete,
  onSetDefault,
  showActions = false,
}: Props) {
  const lines = formatAddressLines(address);
  const title = address.fullName.trim() || "Saved address";

  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium">{title}</p>
            {address.isDefault ? (
              <Badge variant="secondary">Default</Badge>
            ) : null}
          </div>
          {address.mobile ? (
            <p className="text-sm text-muted-foreground">{address.mobile}</p>
          ) : null}
          {address.email ? (
            <p className="text-sm text-muted-foreground">{address.email}</p>
          ) : null}
        </div>
        {selectable ? (
          <span
            className={cn(
              "mt-1 h-4 w-4 shrink-0 rounded-full border",
              selected
                ? "border-primary bg-primary"
                : "border-muted-foreground",
            )}
            aria-hidden="true"
          />
        ) : null}
      </div>
      <div className="mt-3 space-y-0.5 text-sm text-muted-foreground">
        {lines.map((line) => (
          <p key={line}>{line}</p>
        ))}
      </div>
      {showActions ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {!address.isDefault && onSetDefault ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onSetDefault}
            >
              Set as default
            </Button>
          ) : null}
          {onEdit ? (
            <Button type="button" variant="outline" size="sm" onClick={onEdit}>
              Edit
            </Button>
          ) : null}
          {onDelete ? (
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={onDelete}
            >
              Delete
            </Button>
          ) : null}
        </div>
      ) : null}
    </>
  );

  if (selectable) {
    return (
      <button
        type="button"
        onClick={onSelect}
        className={cn(
          "w-full rounded-lg border p-4 text-left transition-colors",
          selected
            ? "border-primary ring-1 ring-primary"
            : "border-border hover:border-primary/50",
        )}
      >
        {content}
      </button>
    );
  }

  return <div className="rounded-lg border p-4">{content}</div>;
}
