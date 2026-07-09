import type { User } from "@supabase/supabase-js";

import { getNameInitials } from "@/lib/utils";

export type AdminUserDisplay = {
  name: string;
  email: string;
  initials: string;
  avatarUrl?: string;
  useUserIconFallback: boolean;
};

function readMetadataString(
  metadata: Record<string, unknown>,
  key: string,
): string | undefined {
  const value = metadata[key];
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : undefined;
}

export function resolveAdminUserDisplay(user: User): AdminUserDisplay {
  const metadata = (user.user_metadata ?? {}) as Record<string, unknown>;
  const name =
    readMetadataString(metadata, "name") ??
    readMetadataString(metadata, "full_name") ??
    user.email?.split("@")[0]?.trim() ??
    "Admin";

  const avatarUrl =
    readMetadataString(metadata, "avatar_url") ??
    readMetadataString(metadata, "picture");

  const initials = getNameInitials(name).slice(0, 2);

  return {
    name,
    email: user.email ?? "",
    initials,
    avatarUrl,
    useUserIconFallback: initials.length === 0,
  };
}
