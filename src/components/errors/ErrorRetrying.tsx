export function ErrorRetrying() {
  return (
    <main
      role="status"
      aria-live="polite"
      className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center gap-4 px-6 py-16 text-center"
    >
      <span className="h-8 w-8 animate-spin rounded-full border-2 border-brand-rose/30 border-t-brand-rose" />
      <p className="text-sm text-muted-foreground">Reconnecting…</p>
    </main>
  );
}
