import AdminShell from "@/components/admin/AdminShell";
import { AnnouncementBarForm } from "@/features/admin/settings/AnnouncementBarForm";

export default function AdminAnnouncementBarPage() {
  return (
    <AdminShell
      heading="Announcement Bar"
      description="Manage the green top ribbon on the storefront (message, CTA, and link per line)."
    >
      <AnnouncementBarForm />
    </AdminShell>
  );
}
