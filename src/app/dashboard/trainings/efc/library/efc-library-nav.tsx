"use client";

import { useEffect, useRef } from "react";

interface Props {
  /** The currently active section key — drives scroll-position save/restore. */
  activeSection: string;
}

/**
 * EfcLibraryNav — Client Component
 *
 * Manages scroll-position persistence per section in sessionStorage so that
 * navigating between sections preserves the user's reading position.
 *
 * Behaviour:
 * 1. On mount (or when `activeSection` changes), restore the saved scroll
 *    position for that section from sessionStorage.
 * 2. Before the component unmounts or the section changes, save the current
 *    scroll position for the outgoing section.
 */
export function EfcLibraryNav({ activeSection }: Props) {
  /**
   * We need to save the *outgoing* section key when the effect re-runs due to
   * a section change. Keep the previous section in a ref so the cleanup
   * closure captures the right key.
   */
  const prevSectionRef = useRef<string>(activeSection);

  useEffect(() => {
    const incoming = activeSection;
    const outgoing = prevSectionRef.current;

    // ── Save outgoing section scroll position ────────────────────────
    if (outgoing !== incoming) {
      const y = window.scrollY;
      sessionStorage.setItem(`efc-library-scroll-${outgoing}`, String(y));
      prevSectionRef.current = incoming;
    }

    // ── Restore incoming section scroll position ─────────────────────
    const saved = sessionStorage.getItem(`efc-library-scroll-${incoming}`);
    if (saved !== null) {
      // Use requestAnimationFrame so the new section content is painted first.
      const raf = requestAnimationFrame(() => {
        window.scrollTo({ top: parseInt(saved, 10), behavior: "instant" });
      });
      return () => {
        cancelAnimationFrame(raf);
      };
    } else {
      // No saved position for this section — scroll to top.
      window.scrollTo({ top: 0, behavior: "instant" });
    }
  }, [activeSection]);

  // Save scroll on unmount (user leaves the library page entirely).
  useEffect(() => {
    const section = activeSection;
    return () => {
      sessionStorage.setItem(
        `efc-library-scroll-${section}`,
        String(window.scrollY),
      );
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // This component renders no visible DOM — it only manages side effects.
  return null;
}
