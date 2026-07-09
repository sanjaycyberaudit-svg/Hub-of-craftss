import AdminShell from "@/components/admin/AdminShell";
import { ApiIntegrationsForm } from "@/features/admin/settings/ApiIntegrationsForm";

export default function AdminApiSettingsPage() {
  return (
    <AdminShell
      heading="API Integrations"
      description="Configure Cashfree, PhonePe payment gateway credentials and WhatsApp API automation."
    >
      <ApiIntegrationsForm />
    </AdminShell>
  );
}
