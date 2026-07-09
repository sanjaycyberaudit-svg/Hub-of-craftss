import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { Icons } from "@/components/layouts/icons";
import { AdminUserMenu } from "./AdminUserMenu";

export function AdminSidebarFooter() {
  return (
    <div className="shrink-0 space-y-1 border-t border-border bg-white p-3">
      <Link
        href="/"
        target="_blank"
        rel="noopener noreferrer"
        className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <Icons.store className="h-4 w-4 shrink-0" />
        <span className="flex-1">View store</span>
        <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-60" />
      </Link>
      <AdminUserMenu />
    </div>
  );
}
