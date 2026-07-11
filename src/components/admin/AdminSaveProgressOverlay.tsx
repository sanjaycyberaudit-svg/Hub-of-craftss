"use client";

import { useEffect, useState } from "react";

type AdminSaveProgressOverlayProps = {
  open: boolean;
  title: string;
  message: string;
  step?: number;
  totalSteps?: number;
  /** Prefer this when you want exact % control (0–100). */
  percent?: number;
};

function clampPercent(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, Math.round(value)));
}

export function AdminSaveProgressOverlay({
  open,
  title,
  message,
  step = 0,
  totalSteps = 0,
  percent,
}: AdminSaveProgressOverlayProps) {
  const targetPercent =
    percent != null
      ? clampPercent(percent)
      : totalSteps > 0
        ? clampPercent((Math.max(0, step) / totalSteps) * 100)
        : 0;

  const [displayPercent, setDisplayPercent] = useState(0);

  useEffect(() => {
    if (!open) {
      setDisplayPercent(0);
      return;
    }

    const timer = window.setInterval(() => {
      setDisplayPercent((prev) => {
        if (prev === targetPercent) return prev;
        const gap = targetPercent - prev;
        const stepSize =
          Math.sign(gap) * Math.max(1, Math.ceil(Math.abs(gap) * 0.22));
        const next = prev + stepSize;
        if (
          (stepSize > 0 && next >= targetPercent) ||
          (stepSize < 0 && next <= targetPercent)
        ) {
          return targetPercent;
        }
        return next;
      });
    }, 32);

    return () => window.clearInterval(timer);
  }, [open, targetPercent]);

  if (!open) return null;

  const showSteps = totalSteps > 0 && percent == null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-background/60 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-busy="true"
      aria-labelledby="admin-save-progress-title"
      aria-describedby="admin-save-progress-message"
    >
      <div className="w-[min(92vw,360px)] rounded-xl border border-border bg-card p-5 text-card-foreground shadow-2xl">
        <p
          id="admin-save-progress-title"
          className="text-center text-sm font-semibold text-primary"
        >
          {title}
        </p>
        <p
          id="admin-save-progress-message"
          className="mt-2 text-center text-sm text-muted-foreground"
        >
          {message}
        </p>
        <p className="mt-3 text-center text-3xl font-bold tabular-nums text-primary transition-all duration-300">
          {displayPercent}%
        </p>
        {showSteps ? (
          <p className="mt-1 text-center text-xs text-muted-foreground">
            Step {Math.max(0, step)} of {totalSteps}
          </p>
        ) : null}
        <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-700 ease-out"
            style={{ width: `${displayPercent}%` }}
          />
        </div>
      </div>
    </div>
  );
}
