import { ErrorPageShell } from "@/components/errors/ErrorPageShell";

export default function NotFound() {
  return (
    <ErrorPageShell
      title="Page not found"
      description="The page you are looking for does not exist or may have moved."
      primaryHref="/"
      primaryLabel="Continue shopping"
      secondaryHref="/shop"
      secondaryLabel="Browse shop"
    />
  );
}
