import AdminShell from "@/components/admin/AdminShell";
import { VeloKeysForm } from "@/features/admin/settings/VeloKeysForm";

export default function AdminVeloSettingsPage() {
  return (
    <AdminShell
      heading="Velo"
      description="Generate unique keys for each client app and stream newly paid orders securely."
    >
      <VeloKeysForm />
    </AdminShell>
  );
}
