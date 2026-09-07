"use client";

import { useReducedMotion, type Easing } from "framer-motion";

export interface MotionEntranceProps {
  initial: { opacity: number; y: number } | false;
  whileInView?: { opacity: number; y: number };
  viewport?: { once: boolean; amount: number };
  transition?: { duration: number; ease: Easing; delay?: number };
}

export function useMotionPreferences() {
  const prefersReducedMotion = useReducedMotion();

  function entrance(delay = 0): MotionEntranceProps {
    if (prefersReducedMotion) {
      return { initial: false };
    }
    return {
      initial: { opacity: 0, y: 24 },
      whileInView: { opacity: 1, y: 0 },
      viewport: { once: true, amount: 0.3 },
      transition: { duration: 0.5, ease: "easeOut", delay },
    };
  }

  return { prefersReducedMotion, entrance };
}
