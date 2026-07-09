import Link from "next/link";
import { Button } from "@/components/ui/button";

type Props = {
  title: string;
  description: string;
  primaryHref?: string;
  primaryLabel?: string;
  secondaryHref?: string;
  secondaryLabel?: string;
  onRetry?: () => void;
};

export function ErrorPageShell({
  title,
  description,
  primaryHref = "/",
  primaryLabel = "Back to home",
  secondaryHref,
  secondaryLabel,
  onRetry,
}: Props) {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center gap-4 px-6 py-16 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="text-sm text-muted-foreground">{description}</p>
      <div className="flex flex-wrap justify-center gap-3 pt-2">
        {onRetry ? (
          <Button type="button" onClick={onRetry}>
            Try again
          </Button>
        ) : null}
        <Button asChild variant={onRetry ? "outline" : "default"}>
          <Link href={primaryHref}>{primaryLabel}</Link>
        </Button>
        {secondaryHref && secondaryLabel ? (
          <Button asChild variant="outline">
            <Link href={secondaryHref}>{secondaryLabel}</Link>
          </Button>
        ) : null}
      </div>
    </main>
  );
}
