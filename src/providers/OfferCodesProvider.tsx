"use client";

import type { OfferCodesConfig } from "@/lib/integrations/settings";
import { createContext, useContext, type ReactNode } from "react";

const defaultConfig: OfferCodesConfig = {
  enabled: true,
  codes: [],
};

const OfferCodesContext = createContext<OfferCodesConfig>(defaultConfig);

export function OfferCodesProvider({
  config,
  children,
}: {
  config: OfferCodesConfig;
  children: ReactNode;
}) {
  return (
    <OfferCodesContext.Provider value={config}>
      {children}
    </OfferCodesContext.Provider>
  );
}

export function useOfferCodesConfig() {
  return useContext(OfferCodesContext);
}
