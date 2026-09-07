"use client";

import { motion, useReducedMotion } from "framer-motion";

/** Stopwatch-themed loading indicator used across action and navigation states. */
export function Spinner({ className = "h-4 w-4" }: { className?: string }) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={className}
      fill="none"
    >
      <path
        d="M9 2h6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="12" cy="13" r="8" stroke="currentColor" strokeWidth="2" />
      <motion.line
        x1="12"
        y1="13"
        x2="12"
        y2="8"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        style={{ transformOrigin: "12px 13px" }}
        animate={{ rotate: prefersReducedMotion ? 0 : 360 }}
        transition={
          prefersReducedMotion
            ? { duration: 0 }
            : { repeat: Infinity, duration: 1, ease: "linear" }
        }
      />
    </svg>
  );
}
