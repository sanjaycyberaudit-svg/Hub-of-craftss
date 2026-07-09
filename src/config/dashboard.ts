import type { SidebarNavItem } from "@/types";

export type DashboardConfig = {
  sidebarNav: SidebarNavItem[];
};

export const dashboardConfig: DashboardConfig = {
  sidebarNav: [
    {
      title: "Dashboard",
      href: "/admin/dashboard",
      icon: "layoutDashboard",
      items: [],
    },
    {
      title: "Products",
      href: "/admin/products",
      icon: "cart",
      items: [],
    },
    {
      title: "Categories",
      href: "/admin/collections",
      icon: "folder",
      items: [],
    },
    {
      title: "Testimonials",
      href: "/admin/testimonials",
      icon: "messageSquare",
      items: [],
    },
    {
      title: "Medias",
      href: "/admin/medias",
      icon: "image",
      items: [],
    },
    {
      title: "Users",
      href: "/admin/users",
      icon: "user",
      items: [],
    },
    {
      title: "Orders",
      href: "/admin/orders",
      icon: "receipt",
      items: [],
    },
    {
      title: "API Settings",
      href: "/admin/settings/apis",
      icon: "globe",
      items: [],
    },
    {
      title: "Social URLs",
      href: "/admin/settings/social",
      icon: "instagram",
      items: [],
    },
    {
      title: "Announcement Bar",
      href: "/admin/settings/announcement-bar",
      icon: "tag",
      items: [],
    },
    {
      title: "Home Banner",
      href: "/admin/settings/home-banner",
      icon: "image",
      items: [],
    },
    {
      title: "Velo",
      href: "/admin/settings/velo",
      icon: "globe",
      items: [],
    },
    {
      title: "Courier & GST",
      href: "/admin/settings/courier",
      icon: "globe",
      items: [],
    },
    {
      title: "Offer Codes",
      href: "/admin/settings/offer-codes",
      icon: "tag",
      items: [],
    },
    {
      title: "Settings",
      href: "/admin/settings",
      icon: "settings",
      items: [],
    },
  ],
};
