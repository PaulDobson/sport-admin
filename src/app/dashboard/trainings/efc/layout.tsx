import type { ReactNode } from "react";

/**
 * EFC module layout — shared shell for all /dashboard/trainings/efc/** routes.
 * Keeps nav context and consistent max-width across sub-pages.
 */
export default function EfcLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto max-w-7xl pb-12">
      {children}
    </div>
  );
}
