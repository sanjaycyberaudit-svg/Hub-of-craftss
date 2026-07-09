"use client";

type AdminSaveProgressOverlayProps = {
  open: boolean;
  title: string;
  message: string;
  step: number;
  totalSteps: number;
};

export function AdminSaveProgressOverlay({
  open,
  title,
  message,
  step,
  totalSteps,
}: AdminSaveProgressOverlayProps) {
  if (!open) return null;

  const percent = Math.min(
    100,
    Math.round((step / Math.max(totalSteps, 1)) * 100),
  );

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 backdrop-blur-[1px]"
      role="dialog"
      aria-modal="true"
      aria-busy="true"
      aria-labelledby="admin-save-progress-title"
      aria-describedby="admin-save-progress-message"
    >
      <div className="w-[min(92vw,360px)] rounded-xl border border-[#E8A317]/40 bg-white p-5 shadow-2xl">
        <p
          id="admin-save-progress-title"
          className="text-center text-sm font-semibold text-[#8A5A00]"
        >
          {title}
        </p>
        <p
          id="admin-save-progress-message"
          className="mt-2 text-center text-sm text-muted-foreground"
        >
          {message}
        </p>
        <p className="mt-3 text-center text-3xl font-bold text-[#8A5A00]">
          {percent}%
        </p>
        <p className="mt-1 text-center text-xs text-muted-foreground">
          Step {step} of {totalSteps}
        </p>
        <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-[#FDECC8]">
          <div
            className="h-full rounded-full bg-[#E8A317] transition-all duration-300"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>
    </div>
  );
}
