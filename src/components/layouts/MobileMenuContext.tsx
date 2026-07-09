"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type MobileMenuContextValue = {
  isOpen: boolean;
  setOpen: (open: boolean) => void;
};

const MobileMenuContext = createContext<MobileMenuContextValue | null>(null);

export function MobileMenuProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const setOpen = useCallback((open: boolean) => setIsOpen(open), []);

  const value = useMemo(() => ({ isOpen, setOpen }), [isOpen, setOpen]);

  return (
    <MobileMenuContext.Provider value={value}>
      {children}
    </MobileMenuContext.Provider>
  );
}

export function useMobileMenu() {
  const ctx = useContext(MobileMenuContext);
  if (!ctx) {
    throw new Error("useMobileMenu must be used within MobileMenuProvider");
  }
  return ctx;
}
