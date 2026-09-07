"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

function routeKey(pathname: string, searchParams: URLSearchParams | null) {
  return `${pathname}?${searchParams?.toString() ?? ""}`;
}

function isInternalNavigationClick(event: MouseEvent) {
  if (event.defaultPrevented || event.button !== 0) return null;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
    return null;
  }

  const anchor = (event.target as HTMLElement | null)?.closest("a");
  if (!anchor) return null;
  if (anchor.target && anchor.target !== "_self") return null;
  if (anchor.hasAttribute("download")) return null;

  const href = anchor.getAttribute("href");
  if (!href || href.startsWith("#")) return null;

  let url: URL;
  try {
    url = new URL(href, window.location.href);
  } catch {
    return null;
  }
  if (url.origin !== window.location.origin) return null;

  return url;
}

function NavigationProgressTrack() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const prefersReducedMotion = useReducedMotion();
  const [isNavigating, setIsNavigating] = useState(false);
  const currentKey = useRef(routeKey(pathname, searchParams));

  useEffect(() => {
    const key = routeKey(pathname, searchParams);
    if (key !== currentKey.current) {
      currentKey.current = key;
      setIsNavigating(false);
    }
  }, [pathname, searchParams]);

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      const url = isInternalNavigationClick(event);
      if (!url) return;

      const nextKey = `${url.pathname}?${url.searchParams.toString()}`;
      if (nextKey === currentKey.current) return;

      setIsNavigating(true);
    }

    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  return (
    <div
      role="progressbar"
      aria-label="Cargando pantalla"
      aria-hidden={!isNavigating}
      className="pointer-events-none fixed inset-x-0 top-0 z-200 h-0.75 overflow-hidden"
    >
      <AnimatePresence>
        {isNavigating ? (
          <motion.div
            key="track"
            className="h-full bg-primary"
            style={{
              transformOrigin: "0% 50%",
              backgroundImage:
                "repeating-linear-gradient(90deg, rgba(255,255,255,0.4) 0 10px, transparent 10px 22px)",
            }}
            initial={{ scaleX: 0, opacity: 1 }}
            animate={{ scaleX: prefersReducedMotion ? 1 : 0.92, opacity: 1 }}
            exit={{ scaleX: 1, opacity: 0 }}
            transition={{
              scaleX: {
                duration: prefersReducedMotion ? 0 : 0.6,
                ease: "easeOut",
              },
              opacity: { duration: 0.2 },
            }}
          />
        ) : null}
      </AnimatePresence>
    </div>
  );
}

/** Athletics-track-styled progress bar that signals in-flight route navigation. */
export function NavigationProgressBar() {
  return (
    <Suspense fallback={null}>
      <NavigationProgressTrack />
    </Suspense>
  );
}
