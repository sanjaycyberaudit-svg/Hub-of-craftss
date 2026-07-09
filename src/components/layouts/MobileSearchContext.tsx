"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type MobileSearchContextValue = {
  isOpen: boolean;
  openSearch: () => void;
  closeSearch: () => void;
};

const MobileSearchContext = createContext<MobileSearchContextValue | null>(
  null,
);

export function MobileSearchProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  const openSearch = useCallback(() => setIsOpen(true), []);
  const closeSearch = useCallback(() => setIsOpen(false), []);

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  const value = useMemo(
    () => ({ isOpen, openSearch, closeSearch }),
    [closeSearch, isOpen, openSearch],
  );

  return (
    <MobileSearchContext.Provider value={value}>
      {children}
    </MobileSearchContext.Provider>
  );
}

export function useMobileSearch() {
  const ctx = useContext(MobileSearchContext);
  if (!ctx) {
    throw new Error("useMobileSearch must be used within MobileSearchProvider");
  }
  return ctx;
}
