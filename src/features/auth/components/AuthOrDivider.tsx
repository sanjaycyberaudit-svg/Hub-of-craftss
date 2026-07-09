export function AuthOrDivider() {
  return (
    <div className="relative py-1">
      <div className="absolute inset-0 flex items-center">
        <span className="w-full border-t border-primary/15" />
      </div>
      <span className="relative mx-auto block w-fit bg-card px-3 text-xs uppercase tracking-wide text-muted-foreground">
        Or use email
      </span>
    </div>
  );
}
