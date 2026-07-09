"use client";

import { getDefaultAnnouncementLines } from "@/lib/announcements/defaults";
import type { ResolvedStorefrontAnnouncements } from "@/lib/announcements/types";
import { createContext, useContext, type ReactNode } from "react";

const defaultState: ResolvedStorefrontAnnouncements = {
  enabled: true,
  items: getDefaultAnnouncementLines(),
};

const AnnouncementsContext =
  createContext<ResolvedStorefrontAnnouncements>(defaultState);

export function AnnouncementsProvider({
  announcements,
  children,
}: {
  announcements: ResolvedStorefrontAnnouncements;
  children: ReactNode;
}) {
  return (
    <AnnouncementsContext.Provider value={announcements}>
      {children}
    </AnnouncementsContext.Provider>
  );
}

export function useStorefrontAnnouncements() {
  return useContext(AnnouncementsContext);
}
