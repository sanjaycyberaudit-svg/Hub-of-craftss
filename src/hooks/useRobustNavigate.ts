"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef } from "react";

const FALLBACK_MS = 900;

function normalizePath(path: string) {
  const base = path.split("?")[0]?.split("#")[0] ?? "/";
  if (base === "/") return "/";
  return base.replace(/\/$/, "") || "/";
}

function isModifiedClick(event: React.MouseEvent) {
  return (
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  );
}

/**
 * Client navigation with hard-reload fallback when App Router soft nav stalls
 * (common on mobile after server/RSC errors or stuck transitions).
 */
export function useRobustNavigate() {
  const router = useRouter();
  const pathname = usePathname();
  const pathnameRef = useRef(pathname);
  const pendingHrefRef = useRef<string | null>(null);
  const fallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    pathnameRef.current = pathname;
    pendingHrefRef.current = null;
    if (fallbackTimerRef.current) {
      clearTimeout(fallbackTimerRef.current);
      fallbackTimerRef.current = null;
    }
  }, [pathname]);

  useEffect(() => {
    return () => {
      if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current);
    };
  }, []);

  const navigate = useCallback(
    (href: string, event?: React.MouseEvent) => {
      if (event && isModifiedClick(event)) return;

      event?.preventDefault();

      const target = normalizePath(href);
      const current = normalizePath(pathnameRef.current);

      if (target === current) {
        window.scrollTo({ top: 0, behavior: "smooth" });
        router.refresh();
        return;
      }

      if (fallbackTimerRef.current) {
        clearTimeout(fallbackTimerRef.current);
      }

      const originPath = pathnameRef.current;
      pendingHrefRef.current = href;

      try {
        router.push(href);
      } catch {
        window.location.assign(href);
        return;
      }

      fallbackTimerRef.current = setTimeout(() => {
        fallbackTimerRef.current = null;
        if (pendingHrefRef.current !== href) return;

        const stillHere =
          normalizePath(window.location.pathname) === normalizePath(originPath);

        if (stillHere) {
          window.location.assign(href);
        }

        pendingHrefRef.current = null;
      }, FALLBACK_MS);
    },
    [router],
  );

  const onNavigateClick = useCallback(
    (href: string) => (event: React.MouseEvent<HTMLAnchorElement>) => {
      navigate(href, event);
    },
    [navigate],
  );

  return { navigate, onNavigateClick };
}
