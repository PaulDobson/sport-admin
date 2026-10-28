"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ComponentProps,
  type ReactNode,
} from "react";

export const StudentFeedbackContext = createContext<
  ((message: string) => void) | null
>(null);

// ─────────────────────────────────────────────────────────────────────────────
// WorkspaceGuard — exposes stable increment/decrement functions to child forms.
//
// Using functions (not raw ref values) in context satisfies the React Compiler
// immutability rule: the context object itself never changes, only the underlying
// ref .current values do — which is intentional (they are not React state).
//
// This replaces the original querySelector('form[data-pending="true"]') calls
// that traversed the DOM on every anchor click.
// ─────────────────────────────────────────────────────────────────────────────

type WorkspaceGuard = {
  incPending: () => void;
  decPending: () => void;
  incDirty: () => void;
  decDirty: () => void;
};

export const WorkspaceGuardContext = createContext<WorkspaceGuard | null>(null);

export function StudentWorkspace({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Counters live as refs — mutations are synchronous and never trigger renders
  const pendingCount = useRef(0);
  const dirtyCount = useRef(0);

  // Stable guard functions — created once, never change identity
  const guard: WorkspaceGuard = {
    incPending: useCallback(() => {
      pendingCount.current++;
    }, []),
    decPending: useCallback(() => {
      pendingCount.current = Math.max(0, pendingCount.current - 1);
    }, []),
    incDirty: useCallback(() => {
      dirtyCount.current++;
    }, []),
    decDirty: useCallback(() => {
      dirtyCount.current = Math.max(0, dirtyCount.current - 1);
    }, []),
  };

  useEffect(() => {
    const hasPending = () => pendingCount.current > 0;
    const hasDirty = () => dirtyCount.current > 0;

    const approveLeaving = (event: Event) => {
      if (hasPending()) {
        event.preventDefault();
        event.stopPropagation();
        setMessage("Espera a que termine la operación antes de salir.");
      } else if (
        hasDirty() &&
        !window.confirm(
          "Tienes cambios sin guardar. ¿Quieres descartarlos y salir?",
        )
      ) {
        event.preventDefault();
        event.stopPropagation();
      } else {
        setMessage(null);
        // Reset dirty counter when user confirms navigation
        dirtyCount.current = 0;
      }
    };

    const leaving = (event: MouseEvent) => {
      if (!(event.target instanceof Element)) return;
      const anchor = event.target.closest("a[href]");
      if (
        !(anchor instanceof HTMLAnchorElement) ||
        anchor.hasAttribute("download") ||
        anchor.target === "_blank" ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        event.altKey
      )
        return;
      if (anchor.href !== window.location.href) approveLeaving(event);
    };

    const changingContext = (event: SubmitEvent) => {
      // Only intercept forms submitted outside the workspace
      if (
        event.target instanceof HTMLFormElement &&
        !document.querySelector("[data-workspace]")?.contains(event.target)
      )
        approveLeaving(event);
    };

    const unloading = (event: BeforeUnloadEvent) => {
      if (hasDirty() || hasPending()) {
        event.preventDefault();
        event.returnValue = "";
      }
    };

    // Capture navigation state at mount time inside the effect, where window
    // is guaranteed to be available.
    const originalUrl = window.location.href;
    const originalState: unknown = window.history.state;

    const navigatingBack = (event: PopStateEvent) => {
      if (!hasDirty() && !hasPending()) return;
      if (
        hasPending() ||
        !window.confirm(
          "Tienes cambios sin guardar. ¿Quieres descartarlos y salir?",
        )
      ) {
        event.stopImmediatePropagation();
        window.history.pushState(originalState, "", originalUrl);
        setMessage(
          hasPending()
            ? "Espera a que termine la operación antes de salir."
            : "Tus cambios siguen disponibles. Guarda o cancela antes de salir.",
        );
      }
    };

    document.addEventListener("click", leaving, true);
    document.addEventListener("submit", changingContext, true);
    window.addEventListener("beforeunload", unloading);
    window.addEventListener("popstate", navigatingBack, true);

    return () => {
      document.removeEventListener("click", leaving, true);
      document.removeEventListener("submit", changingContext, true);
      window.removeEventListener("beforeunload", unloading);
      window.removeEventListener("popstate", navigatingBack, true);
    };
    // Empty deps: captures URL at mount and manages its own cleanup.
    // Re-running would re-capture the current URL, breaking back-nav guard.
  }, []);

  return (
    <WorkspaceGuardContext.Provider value={guard}>
      <StudentFeedbackContext.Provider value={setNotice}>
        {/* data-workspace used by changingContext to detect "outside" submits */}
        <div data-workspace className="min-w-0">
          {message ? (
            <p
              role="alert"
              className="mb-4 rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm"
            >
              {message}
            </p>
          ) : null}
          {notice ? (
            <p
              role="status"
              className="mb-4 rounded-lg border border-success/30 bg-success/10 p-3 text-sm text-success"
            >
              {notice}
            </p>
          ) : null}
          {children}
        </div>
      </StudentFeedbackContext.Provider>
    </WorkspaceGuardContext.Provider>
  );
}

export function StudentActionForm({
  children,
  pending,
  feedback,
  ...props
}: ComponentProps<"form"> & {
  pending: boolean;
  feedback: {
    saved?: boolean;
    createdStudentId?: string;
    error: string | null;
  };
}) {
  const form = useRef<HTMLFormElement>(null);
  const guard = useContext(WorkspaceGuardContext);

  // Track whether THIS form instance is currently contributing to the counters
  // so we can accurately decrement on cleanup without going below zero.
  const isPending = useRef(false);
  const isDirty = useRef(false);

  // ── Sync pending counter when the `pending` prop changes ─────────────────
  useEffect(() => {
    if (pending && !isPending.current) {
      guard?.incPending();
      isPending.current = true;
    } else if (!pending && isPending.current) {
      guard?.decPending();
      isPending.current = false;
    }
  }, [pending, guard]);

  // ── Clear dirty on successful save ────────────────────────────────────────
  // Using primitive deps to avoid spurious re-runs when the feedback object is
  // recreated by the parent on every render even with the same values.
  const { saved, createdStudentId } = feedback;
  useEffect(() => {
    if ((saved || createdStudentId) && form.current) {
      form.current.dataset.dirty = "false";
      if (isDirty.current) {
        guard?.decDirty();
        isDirty.current = false;
      }
    }
  }, [saved, createdStudentId, guard]);

  // ── Cleanup: decrement counters if the form unmounts while still dirty/pending
  useEffect(() => {
    return () => {
      if (isDirty.current) guard?.decDirty();
      if (isPending.current) guard?.decPending();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Mark dirty on first change (stable callback) ──────────────────────────
  const handleChange = useCallback(() => {
    if (!isDirty.current) {
      guard?.incDirty();
      isDirty.current = true;
    }
    if (form.current) form.current.dataset.dirty = "true";
  }, [guard]);

  return (
    <form
      {...props}
      ref={form}
      data-pending={pending}
      onChange={handleChange}
      onInvalidCapture={(event) => {
        if (!(event.target instanceof HTMLElement)) return;
        let details = event.target.closest("details");
        while (details) {
          details.open = true;
          details = details.parentElement?.closest("details") ?? null;
        }
      }}
    >
      <fieldset disabled={pending} className="contents">
        {children}
      </fieldset>
    </form>
  );
}
