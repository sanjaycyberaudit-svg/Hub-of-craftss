import { AuthStoreShell } from "@/components/layouts/AuthStoreShell";
import { siteConfig } from "@/config/site";
import { getDefaultAnnouncementLines } from "@/lib/announcements/defaults";
import {
  resolveStorefrontAnnouncements,
  resolveStorefrontSocial,
} from "@/lib/integrations/settings";
import { AnnouncementsProvider } from "@/providers/AnnouncementsProvider";
import { SocialLinksProvider } from "@/providers/SocialLinksProvider";

async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  fallback: T,
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((resolve) => {
        timeoutId = setTimeout(() => resolve(fallback), ms);
      }),
    ]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [social, announcements] = await Promise.all([
    withTimeout(resolveStorefrontSocial(), 5000, {
      instagram: siteConfig.social.instagram,
      youtube: siteConfig.social.youtube,
      facebook: siteConfig.social.facebook,
      whatsapp: siteConfig.social.whatsapp,
    }),
    withTimeout(resolveStorefrontAnnouncements(), 5000, {
      enabled: true,
      items: getDefaultAnnouncementLines(),
    }),
  ]);

  return (
    <SocialLinksProvider social={social}>
      <AnnouncementsProvider announcements={announcements}>
        <AuthStoreShell>{children}</AuthStoreShell>
      </AnnouncementsProvider>
    </SocialLinksProvider>
  );
}
