"use client";

import { siteConfig } from "@/config/site";
import { createContext, useContext, type ReactNode } from "react";

export type StorefrontSocialLinks = {
  instagram: string;
  youtube: string;
  facebook: string;
  whatsapp: string;
};

const defaultSocial: StorefrontSocialLinks = { ...siteConfig.social };

const SocialLinksContext = createContext<StorefrontSocialLinks>(defaultSocial);

export function SocialLinksProvider({
  social,
  children,
}: {
  social: StorefrontSocialLinks;
  children: ReactNode;
}) {
  return (
    <SocialLinksContext.Provider value={social}>
      {children}
    </SocialLinksContext.Provider>
  );
}

export function useStorefrontSocial() {
  return useContext(SocialLinksContext);
}
