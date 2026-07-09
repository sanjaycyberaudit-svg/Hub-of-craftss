import AdminShell from "@/components/admin/AdminShell";
import { BulkOrderGuardForm } from "@/features/admin/settings/BulkOrderGuardForm";
import { ShopContactForm } from "@/features/admin/settings/ShopContactForm";
import { StockControlForm } from "@/features/admin/settings/StockControlForm";

export default function AdminSettingsPage() {
  return (
    <AdminShell
      heading="Settings"
      description="Stock control, bulk orders, and shop contact for the storefront."
    >
      <div className="max-w-3xl space-y-8">
        <StockControlForm />
        <BulkOrderGuardForm />
        <ShopContactForm />
      </div>
    </AdminShell>
  );
}
