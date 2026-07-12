import { AdminSidebarBrand } from "@/components/admin/AdminSidebarBrand";
import { AdminSidebarFooter } from "@/components/admin/AdminSidebarFooter";
import { SidebarNav } from "@/components/admin/SidebarNav";
import { dashboardConfig } from "@/config/dashboard";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="flex h-full min-h-0 w-full bg-background">
      <aside className="admin-scroll hidden h-full min-h-0 w-[var(--admin-sidebar-width)] shrink-0 flex-col overflow-hidden border-r bg-card md:flex">
        <div className="flex flex-1 flex-col overflow-y-auto overscroll-contain px-3 py-5">
          <AdminSidebarBrand className="mb-5 flex items-center gap-3 rounded-md px-3 py-2 transition-colors hover:bg-muted" />
          <SidebarNav items={dashboardConfig.sidebarNav} />
        </div>
        <AdminSidebarFooter />
      </aside>
      <main className="admin-scroll min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain px-4 py-5 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
