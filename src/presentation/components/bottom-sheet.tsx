"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { Button } from "./primitives";

interface BottomSheetProps {
  /** Omit to render only the panel, e.g. when opened from a URL parameter. */
  trigger?: ReactNode;
  title: string;
  description?: string;
  children: ReactNode;
  triggerClassName?: string;
  triggerLabel?: string;
  /** Controlled open state; pair with `onOpenChange`. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** `side` keeps the bottom sheet on mobile and docks a full-height panel on desktop. */
  variant?: "sheet" | "side";
  /** `wide` gives the desktop side panel room for a two-column layout. */
  size?: "default" | "wide";
}

const panelVariants = {
  sheet:
    "relative max-h-[85dvh] w-full overscroll-contain overflow-y-auto rounded-t-2xl border border-border bg-card p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl outline-none sm:max-w-lg sm:rounded-2xl",
  side: "relative max-h-[90dvh] w-full overscroll-contain overflow-y-auto rounded-t-2xl border border-border bg-card p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl outline-none sm:max-w-lg sm:rounded-2xl lg:ml-auto lg:h-dvh lg:max-h-dvh lg:rounded-none lg:border-y-0 lg:border-r-0 lg:p-6",
};

const containerVariants = {
  sheet:
    "fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-4",
  side: "fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-4 lg:items-stretch lg:justify-end lg:p-0",
};

/** Mobile-first action surface: opens over the list without losing scroll position. */
export function BottomSheet({
  trigger,
  title,
  description,
  children,
  triggerClassName,
  triggerLabel,
  open: controlledOpen,
  onOpenChange,
  variant = "sheet",
  size = "default",
}: BottomSheetProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const open = controlledOpen ?? uncontrolledOpen;
  const onOpenChangeRef = useRef(onOpenChange);
  useEffect(() => {
    onOpenChangeRef.current = onOpenChange;
  });
  const titleId = useId();
  const descriptionId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const setOpen = useCallback(
    (next: boolean) => {
      if (controlledOpen === undefined) setUncontrolledOpen(next);
      onOpenChangeRef.current?.(next);
    },
    [controlledOpen],
  );

  useEffect(() => {
    if (!open) return;
    const returnFocusTo =
      triggerRef.current ??
      (document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
      } else if (event.key === "Tab") {
        const controls = Array.from(
          panelRef.current?.querySelectorAll<HTMLElement>(
            ':is(button, input:not([type="hidden"]), select, textarea, a[href], [tabindex="0"]):not(:disabled)',
          ) ?? [],
        );
        const first = controls[0];
        const last = controls[controls.length - 1];
        if (!first || !last) {
          event.preventDefault();
        } else if (event.shiftKey && (document.activeElement === first || document.activeElement === panelRef.current)) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && (document.activeElement === last || document.activeElement === panelRef.current)) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      if (returnFocusTo?.isConnected) returnFocusTo.focus();
    };
  }, [open, setOpen]);

  return (
    <>
      {trigger !== undefined ? (
        <button
          ref={triggerRef}
          type="button"
          aria-haspopup="dialog"
          aria-label={triggerLabel}
          title={triggerLabel}
          aria-expanded={open}
          onClick={() => setOpen(true)}
          className={
            triggerClassName ??
            "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-border bg-surface-raised px-3 text-sm font-semibold text-foreground transition-colors hover:bg-surface-overlay"
          }
        >
          {trigger}
        </button>
      ) : null}
      {open ? createPortal(
        <div className={containerVariants[variant]}>
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
            aria-describedby={description ? descriptionId : undefined}
            tabIndex={-1}
            className={`${panelVariants[variant]} ${variant === "side" ? (size === "wide" ? "lg:max-w-3xl" : "lg:max-w-xl") : ""}`}
          >
            <div
              className="mx-auto mb-3 h-1 w-10 rounded-full bg-border sm:hidden"
              aria-hidden="true"
            />
            <h3 id={titleId} className="text-lg font-semibold">
              {title}
            </h3>
            {description ? (
              <p id={descriptionId} className="mt-1 text-sm text-muted-foreground">
                {description}
              </p>
            ) : null}
            <div className="mt-4">{children}</div>
            <Button
              variant="quiet"
              className="mt-3 w-full"
              onClick={() => {
                setOpen(false);
              }}
            >
              Cerrar
            </Button>
          </div>
        </div>,
        document.body,
      ) : null}
    </>
  );
}
