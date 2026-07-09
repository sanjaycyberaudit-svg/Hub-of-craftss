import { ErrorPageShell } from "@/components/errors/ErrorPageShell";

export default function ForbiddenPage() {
  return (
    <ErrorPageShell
      title="Access denied"
      description="You do not have permission to view this page."
      primaryHref="/"
      primaryLabel="Back to home"
      secondaryHref="/sign-in"
      secondaryLabel="Sign in"
    />
  );
}
