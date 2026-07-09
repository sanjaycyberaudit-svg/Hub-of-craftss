import { AuthStoreShell } from "@/components/layouts/AuthStoreShell";
import {
  resolveStorefrontAnnouncements,
  resolveStorefrontSocial,
} from "@/lib/integrations/settings";
import { AnnouncementsProvider } from "@/providers/AnnouncementsProvider";
import { SocialLinksProvider } from "@/providers/SocialLinksProvider";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [social, announcements] = await Promise.all([
    resolveStorefrontSocial(),
    resolveStorefrontAnnouncements(),
  ]);

  return (
    <SocialLinksProvider social={social}>
      <AnnouncementsProvider announcements={announcements}>
        <AuthStoreShell>{children}</AuthStoreShell>
      </AnnouncementsProvider>
    </SocialLinksProvider>
  );
}
