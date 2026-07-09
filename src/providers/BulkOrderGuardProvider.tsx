"use client";

import type { BulkOrderGuardConfig } from "@/lib/integrations/settings";
import { createContext, useContext, type ReactNode } from "react";

const defaultConfig: BulkOrderGuardConfig = {
  enabled: true,
  threshold: 9,
};

const BulkOrderGuardContext =
  createContext<BulkOrderGuardConfig>(defaultConfig);

export function BulkOrderGuardProvider({
  config,
  children,
}: {
  config: BulkOrderGuardConfig;
  children: ReactNode;
}) {
  return (
    <BulkOrderGuardContext.Provider value={config}>
      {children}
    </BulkOrderGuardContext.Provider>
  );
}

export function useBulkOrderGuardConfig() {
  return useContext(BulkOrderGuardContext);
}
