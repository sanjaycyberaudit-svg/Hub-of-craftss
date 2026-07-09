"use client";

import type { CourierChargesConfig } from "@/lib/integrations/settings";
import { createContext, useContext, type ReactNode } from "react";

const defaultConfig: CourierChargesConfig = {
  enabled: true,
  tamilNaduBase: 40,
  southStatesBase: 60,
  restOfIndiaBase: 75,
  qty2To4AddOn: 40,
  qty5PlusFlat: 200,
  gstEnabled: true,
  gstPercentage: 5,
};

const CourierChargesContext =
  createContext<CourierChargesConfig>(defaultConfig);

export function CourierChargesProvider({
  config,
  children,
}: {
  config: CourierChargesConfig;
  children: ReactNode;
}) {
  return (
    <CourierChargesContext.Provider value={config}>
      {children}
    </CourierChargesContext.Provider>
  );
}

export function useCourierChargesConfig() {
  return useContext(CourierChargesContext);
}
