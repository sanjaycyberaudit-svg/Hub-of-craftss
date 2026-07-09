import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

type AdminLoadingStateProps = {
  message: string;
  className?: string;
};

export function AdminLoadingState({
  message,
  className,
}: AdminLoadingStateProps) {
  return (
    <p
      className={cn(
        "inline-flex items-center gap-2 rounded-md border border-[#E8A317]/40 bg-[#FFF7E6] px-3 py-1.5 text-xs font-medium text-[#8A5A00]",
        className,
      )}
    >
      <Spinner className="h-3.5 w-3.5 animate-spin text-[#FDECC8] fill-[#8A5A00]" />
      {message}
    </p>
  );
}

type LoadingButtonLabelProps = {
  isLoading: boolean;
  loadingText: string;
  idleText: string;
};

export function LoadingButtonLabel({
  isLoading,
  loadingText,
  idleText,
}: LoadingButtonLabelProps) {
  return (
    <span className="inline-flex items-center gap-2">
      {isLoading ? <Spinner className="h-4 w-4 animate-spin" /> : null}
      {isLoading ? loadingText : idleText}
    </span>
  );
}
