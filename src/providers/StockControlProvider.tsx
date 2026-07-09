"use client";

import type { StockControlConfig } from "@/lib/integrations/settings";
import { createContext, useContext, type ReactNode } from "react";

const defaultConfig: StockControlConfig = {
  enabled: false,
  lowStockThreshold: 5,
};

const StockControlContext = createContext<StockControlConfig>(defaultConfig);

export function StockControlProvider({
  config,
  children,
}: {
  config: StockControlConfig;
  children: ReactNode;
}) {
  return (
    <StockControlContext.Provider value={config}>
      {children}
    </StockControlContext.Provider>
  );
}

export function useStockControlConfig() {
  return useContext(StockControlContext);
}
