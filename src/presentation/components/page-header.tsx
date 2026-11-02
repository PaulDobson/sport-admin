import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  description?: string;
  /** Optional right-aligned slot — CTA buttons, links, etc. */
  action?: ReactNode;
}

/**
 * Standardized page-level header for all dashboard sections.
 *
 * Renders a responsive flex row with the title+description on the left and
 * an optional action slot on the right. On narrow viewports the action wraps
 * below the text so it stays full-width and easy to tap.
 */
export function PageHeader({ title, description, action }: PageHeaderProps) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {description ? (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {action ? (
        <div className="flex shrink-0 items-center gap-2">{action}</div>
      ) : null}
    </div>
  );
}
