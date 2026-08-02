import AdminShell from "@/components/admin/AdminShell";
import { CourierChargesForm } from "@/features/admin/settings/CourierChargesForm";

export default function AdminCourierSettingsPage() {
  return (
    <AdminShell
      heading="Courier & GST Settings"
      description="Configure state-wise courier rates, free shipping threshold, quantity slab rules, and GST used during checkout."
    >
      <CourierChargesForm />
    </AdminShell>
  );
}
