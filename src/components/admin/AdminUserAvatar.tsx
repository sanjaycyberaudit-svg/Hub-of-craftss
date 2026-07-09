"use client";

import { User as UserIcon } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

type AdminUserAvatarProps = {
  name: string;
  initials: string;
  avatarUrl?: string;
  useUserIconFallback?: boolean;
  className?: string;
};

export function AdminUserAvatar({
  name,
  initials,
  avatarUrl,
  useUserIconFallback = false,
  className,
}: AdminUserAvatarProps) {
  return (
    <Avatar
      className={cn(
        "h-9 w-9 shrink-0 border border-primary/15 bg-muted/40",
        className,
      )}
      aria-hidden
    >
      {avatarUrl ? (
        <AvatarImage src={avatarUrl} alt={name} className="object-cover" />
      ) : null}
      <AvatarFallback className="bg-primary/10 text-sm font-semibold text-primary">
        {useUserIconFallback ? (
          <UserIcon className="h-4 w-4" aria-hidden />
        ) : (
          initials
        )}
      </AvatarFallback>
    </Avatar>
  );
}
