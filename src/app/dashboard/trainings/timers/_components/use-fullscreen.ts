"use client";

import { useCallback, useRef, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface UseFullscreenReturn {
  isFullscreen: boolean;
  enter: () => void;
  exit: () => void;
  toggle: () => void;
  ref: React.RefObject<HTMLDivElement | null>;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Controls the fullscreen projection overlay using CSS only (position: fixed).
 *
 * We intentionally avoid the browser Fullscreen API because:
 * - It requires a synchronous call inside a user-gesture handler, which is
 *   incompatible with async timer setup functions.
 * - It is blocked in iframes, some localhost setups, and certain browsers.
 *
 * The CSS overlay (fixed inset-0 z-9999) covers the entire viewport including
 * the app shell, producing the same visual result for projection purposes.
 * Users who want the OS-level fullscreen (hide browser chrome) can press F11
 * independently.
 */
export function useFullscreen(): UseFullscreenReturn {
  const ref = useRef<HTMLDivElement | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const enter = useCallback(() => setIsFullscreen(true), []);
  const exit = useCallback(() => setIsFullscreen(false), []);
  const toggle = useCallback(() => setIsFullscreen((v) => !v), []);

  return { isFullscreen, enter, exit, toggle, ref };
}
