import AdminShell from "@/components/admin/AdminShell";
import { OfferCodesForm } from "@/features/admin/settings/OfferCodesForm";

export default function AdminOfferCodesPage() {
  return (
    <AdminShell
      heading="Offer Codes"
      description="Create and manage promo codes with percentage discounts for checkout."
    >
      <OfferCodesForm />
    </AdminShell>
  );
}
