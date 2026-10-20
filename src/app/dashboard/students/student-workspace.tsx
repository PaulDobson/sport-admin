"use client";

import {
  createContext,
  useEffect,
  useRef,
  useState,
  type ComponentProps,
  type ReactNode,
} from "react";

export const StudentFeedbackContext = createContext<
  ((message: string) => void) | null
>(null);

export function StudentWorkspace({ children }: { children: ReactNode }) {
  const workspace = useRef<HTMLDivElement>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    // These helpers query the DOM only when an event is fired, not on every
    // render. The ref to workspace.current is read at event time, which is
    // correct — we want the live DOM, not a snapshot.
    const hasPending = () =>
      Boolean(workspace.current?.querySelector('form[data-pending="true"]'));
    const hasDirty = () =>
      Boolean(workspace.current?.querySelector('form[data-dirty="true"]'));

    const clearDirtyForms = () => {
      workspace.current
        ?.querySelectorAll<HTMLFormElement>("form[data-dirty='true']")
        .forEach((form) => {
          form.dataset.dirty = "false";
        });
    };

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
        // Only clear forms that are actually dirty.
        clearDirtyForms();
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
      if (
        event.target instanceof HTMLFormElement &&
        !workspace.current?.contains(event.target)
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
    // Empty deps: this effect captures URL at mount and manages its own
    // cleanup. Re-running on every render would re-capture the current URL,
    // breaking the back-navigation guard.
  }, []);

  return (
    <StudentFeedbackContext.Provider value={setNotice}>
      <div ref={workspace} className="min-w-0">
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

  // Use primitive values as deps instead of the feedback object reference.
  // The object is recreated on every parent render even when values are
  // identical, which would otherwise trigger this effect spuriously.
  const { saved, createdStudentId } = feedback;
  useEffect(() => {
    if ((saved || createdStudentId) && form.current) {
      form.current.dataset.dirty = "false";
    }
  }, [saved, createdStudentId]);

  return (
    <form
      {...props}
      ref={form}
      data-pending={pending}
      onChange={() => {
        if (form.current) form.current.dataset.dirty = "true";
      }}
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
