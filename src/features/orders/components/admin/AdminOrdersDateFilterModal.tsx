"use client";

import * as React from "react";
import { Check, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ADMIN_ORDERS_PERIOD_MENU,
  createFiltersForPreset,
  createRangeDateFilters,
  istCalendarDay,
  parseDdMmYyyyToIso,
  formatIsoToDdMmYyyy,
  resolveAdminOrdersDateFilters,
  validateAdminOrdersDateFilters,
  type AdminOrdersDateFilterState,
  type AdminOrdersDatePreset,
} from "@/lib/admin/admin-orders-date-filter";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  initialFilters: AdminOrdersDateFilterState;
  onClose: () => void;
  onApply: (filters: AdminOrdersDateFilterState) => void;
  applying?: boolean;
};

export function AdminOrdersDateFilterModal({
  open,
  initialFilters,
  onClose,
  onApply,
  applying = false,
}: Props) {
  const resolvedInitial = resolveAdminOrdersDateFilters(initialFilters);
  const [customMode, setCustomMode] = React.useState(
    resolvedInitial.datePreset === "range",
  );
  const [fromText, setFromText] = React.useState(
    resolvedInitial.datePreset === "range"
      ? formatIsoToDdMmYyyy(resolvedInitial.fromDate)
      : formatIsoToDdMmYyyy(istCalendarDay()),
  );
  const [toText, setToText] = React.useState(
    resolvedInitial.datePreset === "range"
      ? formatIsoToDdMmYyyy(resolvedInitial.toDate)
      : formatIsoToDdMmYyyy(istCalendarDay()),
  );
  const [formError, setFormError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    const resolved = resolveAdminOrdersDateFilters(initialFilters);
    const isCustom = resolved.datePreset === "range";
    setCustomMode(isCustom);
    setFromText(
      formatIsoToDdMmYyyy(isCustom ? resolved.fromDate : istCalendarDay()),
    );
    setToText(
      formatIsoToDdMmYyyy(isCustom ? resolved.toDate : istCalendarDay()),
    );
    setFormError(null);
  }, [open, initialFilters]);

  React.useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !applying) onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, applying, onClose]);

  const selectedPreset = resolveAdminOrdersDateFilters(initialFilters).datePreset;

  const handlePreset = (preset: Exclude<AdminOrdersDatePreset, "range">) => {
    if (applying) return;
    setCustomMode(false);
    setFormError(null);
    onApply(createFiltersForPreset(preset));
  };

  const handleCustomClick = () => {
    setCustomMode(true);
    setFormError(null);
    if (!fromText.trim()) setFromText(formatIsoToDdMmYyyy(istCalendarDay()));
    if (!toText.trim()) setToText(formatIsoToDdMmYyyy(istCalendarDay()));
  };

  const handleApplyCustom = () => {
    const fromIso = parseDdMmYyyyToIso(fromText);
    const toIso = parseDdMmYyyyToIso(toText);
    if (fromIso === null || toIso === null) {
      setFormError("Use dates as DD-MM-YYYY.");
      return;
    }
    if (!fromIso || !toIso) {
      setFormError("Select both From and To dates.");
      return;
    }
    const merged = createRangeDateFilters(fromIso, toIso);
    const err = validateAdminOrdersDateFilters(merged);
    if (err) {
      setFormError(err);
      return;
    }
    setFormError(null);
    onApply(merged);
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/45 p-0 md:items-center md:px-4"
      role="presentation"
      onClick={() => {
        if (!applying) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-orders-filter-title"
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
        className="flex max-h-[92dvh] w-full flex-col rounded-t-2xl border border-border bg-background shadow-xl md:max-w-md md:rounded-2xl"
      >
        <div className="flex shrink-0 items-center justify-between border-b px-5 py-4">
          <h2
            id="admin-orders-filter-title"
            className="text-lg font-semibold text-foreground"
          >
            Filter orders
          </h2>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onClose}
            disabled={applying}
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-5 py-4">
          <div role="listbox" aria-label="Order period" className="space-y-2">
            {ADMIN_ORDERS_PERIOD_MENU.map(({ preset, label }) => {
              const active = !customMode && selectedPreset === preset;
              return (
                <button
                  key={preset}
                  type="button"
                  role="option"
                  aria-selected={active}
                  disabled={applying}
                  onClick={() => handlePreset(preset)}
                  className={cn(
                    "flex min-h-11 w-full items-center justify-between rounded-xl border px-4 text-left text-sm font-semibold transition disabled:opacity-50",
                    active
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-card text-foreground hover:bg-muted/50",
                  )}
                >
                  <span>{label}</span>
                  {active ? <Check className="h-5 w-5" aria-hidden /> : null}
                </button>
              );
            })}

            <button
              type="button"
              role="option"
              aria-selected={customMode}
              disabled={applying}
              onClick={handleCustomClick}
              className={cn(
                "flex min-h-11 w-full items-center justify-between rounded-xl border px-4 text-left text-sm font-semibold transition disabled:opacity-50",
                customMode
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-card text-foreground hover:bg-muted/50",
              )}
            >
              <span>Custom</span>
              {customMode ? <Check className="h-5 w-5" aria-hidden /> : null}
            </button>
          </div>

          {customMode ? (
            <div className="mt-4 space-y-3 rounded-xl border border-border bg-muted/20 p-4">
              <div className="space-y-1.5">
                <Label htmlFor="orders-filter-from">From (DD-MM-YYYY)</Label>
                <Input
                  id="orders-filter-from"
                  inputMode="numeric"
                  placeholder="29-08-2026"
                  value={fromText}
                  disabled={applying}
                  onChange={(e) => setFromText(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="orders-filter-to">To (DD-MM-YYYY)</Label>
                <Input
                  id="orders-filter-to"
                  inputMode="numeric"
                  placeholder="29-08-2026"
                  value={toText}
                  disabled={applying}
                  onChange={(e) => setToText(e.target.value)}
                />
              </div>
              {formError ? (
                <p className="text-sm text-destructive" role="alert">
                  {formError}
                </p>
              ) : null}
              <Button
                type="button"
                className="w-full"
                disabled={applying}
                onClick={handleApplyCustom}
              >
                {applying ? "Applying…" : "Filter"}
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
