"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Button } from "@/presentation/components/primitives";

interface BottomSheetProps {
  trigger: ReactNode;
  title: string;
  description?: string;
  children: ReactNode;
  triggerClassName?: string;
}

/** Mobile-first action surface: opens over the list without losing scroll position. */
export function BottomSheet({
  trigger,
  title,
  description,
  children,
  triggerClassName,
}: BottomSheetProps) {
  const [open, setOpen] = useState(false);
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    panelRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className={
          triggerClassName ??
          "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-border bg-surface-raised px-3 text-sm font-semibold text-foreground transition-colors hover:bg-surface-overlay"
        }
      >
        {trigger}
      </button>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <button
            type="button"
            aria-label="Cerrar panel"
            className="absolute inset-0 bg-black/60"
            onClick={() => setOpen(false)}
          />
          <div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
            className="relative max-h-[85vh] w-full overflow-y-auto rounded-t-2xl border border-border bg-card p-4 shadow-2xl outline-none sm:max-w-lg sm:rounded-2xl"
          >
            <div
              className="mx-auto mb-3 h-1 w-10 rounded-full bg-border sm:hidden"
              aria-hidden="true"
            />
            <h3 id={titleId} className="text-lg font-semibold">
              {title}
            </h3>
            {description ? (
              <p className="mt-1 text-sm text-muted-foreground">
                {description}
              </p>
            ) : null}
            <div className="mt-4">{children}</div>
            <Button
              variant="quiet"
              className="mt-3 w-full"
              onClick={() => {
                setOpen(false);
                triggerRef.current?.focus();
              }}
            >
              Cerrar
            </Button>
          </div>
        </div>
      ) : null}
    </>
  );
}
