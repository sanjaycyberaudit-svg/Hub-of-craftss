import AdminShell from "@/components/admin/AdminShell";
import { HomeBannerForm } from "@/features/admin/settings/HomeBannerForm";

export default function AdminHomeBannerPage() {
  return (
    <AdminShell
      heading="Home Banner"
      description="Manage homepage carousel slides (image, heading, subheading, and button)."
    >
      <HomeBannerForm />
    </AdminShell>
  );
}
