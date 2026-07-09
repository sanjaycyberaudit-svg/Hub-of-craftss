"use client";

import { ChevronUp } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { AdminUserAvatar } from "@/components/admin/AdminUserAvatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { resolveAdminUserDisplay } from "@/lib/auth/admin-user-display";
import { signOutGlobally } from "@/lib/auth/sign-out";
import { useAuth } from "@/providers/AuthProvider";

export function AdminUserMenu() {
  const router = useRouter();
  const { user } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  if (!user) return null;

  const profile = resolveAdminUserDisplay(user);

  const logout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);

    try {
      await signOutGlobally();
      router.refresh();
      router.push("/");
    } catch {
      setIsLoggingOut(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="h-auto w-full justify-start gap-2.5 rounded-md px-3 py-2 text-sm transition-colors hover:bg-muted"
          aria-label={`${profile.name} account menu`}
        >
          <AdminUserAvatar
            name={profile.name}
            initials={profile.initials}
            avatarUrl={profile.avatarUrl}
            useUserIconFallback={profile.useUserIconFallback}
          />
          <span className="min-w-0 flex-1 text-left">
            <span className="block truncate font-medium text-foreground">
              {profile.name}
            </span>
            <span className="block truncate text-xs text-muted-foreground">
              {profile.email}
            </span>
          </span>
          <ChevronUp
            className="h-4 w-4 shrink-0 text-muted-foreground"
            aria-hidden
          />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-[calc(var(--admin-sidebar-width)-1.5rem)] min-w-56"
        align="start"
        side="top"
      >
        <DropdownMenuLabel className="font-normal">
          <div className="flex items-center gap-2.5">
            <AdminUserAvatar
              name={profile.name}
              initials={profile.initials}
              avatarUrl={profile.avatarUrl}
              useUserIconFallback={profile.useUserIconFallback}
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium leading-none">
                {profile.name}
              </p>
              <p className="mt-1 truncate text-xs leading-none text-muted-foreground">
                {profile.email}
              </p>
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled={isLoggingOut} onClick={() => void logout()}>
          {isLoggingOut ? "Signing out…" : "Log out"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
