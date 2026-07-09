import AdminShell from "@/components/admin/AdminShell";
import { SocialUrlsForm } from "@/features/admin/settings/SocialUrlsForm";

export default function AdminSocialUrlsPage() {
  return (
    <AdminShell
      heading="Social URLs"
      description="Manage social media links used on the storefront Contact page."
    >
      <SocialUrlsForm />
    </AdminShell>
  );
}
