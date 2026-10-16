"use client";

import { createContext, useEffect, useRef, useState, type ComponentProps, type ReactNode } from "react";

export const StudentFeedbackContext = createContext<((message: string) => void) | null>(null);

export function StudentWorkspace({ children }: { children: ReactNode }) {
  const workspace = useRef<HTMLDivElement>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  useEffect(() => {
    const pending = () => Boolean(workspace.current?.querySelector('form[data-pending="true"]'));
    const dirty = () => Boolean(workspace.current?.querySelector('form[data-dirty="true"]'));
    const approveLeaving = (event: Event) => {
      if (pending()) {
        event.preventDefault();
        event.stopPropagation();
        setMessage("Espera a que termine la operación antes de salir.");
      } else if (dirty() && !window.confirm("Tienes cambios sin guardar. ¿Quieres descartarlos y salir?")) {
        event.preventDefault();
        event.stopPropagation();
      } else {
        setMessage(null);
        workspace.current?.querySelectorAll("form").forEach(form => { form.dataset.dirty = "false"; });
      }
    };
    const leaving = (event: MouseEvent) => {
      if (!(event.target instanceof Element)) return;
      const anchor = event.target.closest("a[href]");
      if (!(anchor instanceof HTMLAnchorElement) || anchor.hasAttribute("download") || anchor.target === "_blank" || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      if (anchor.href !== window.location.href) approveLeaving(event);
    };
    const changingContext = (event: SubmitEvent) => {
      if (event.target instanceof HTMLFormElement && !workspace.current?.contains(event.target)) approveLeaving(event);
    };
    const unloading = (event: BeforeUnloadEvent) => {
      if (dirty() || pending()) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    const originalUrl = window.location.href;
    const originalState: unknown = window.history.state;
    const navigatingBack = (event: PopStateEvent) => {
      if (!dirty() && !pending()) return;
      if (pending() || !window.confirm("Tienes cambios sin guardar. ¿Quieres descartarlos y salir?")) {
        event.stopImmediatePropagation();
        window.history.pushState(originalState, "", originalUrl);
        setMessage(pending() ? "Espera a que termine la operación antes de salir." : "Tus cambios siguen disponibles. Guarda o cancela antes de salir.");
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
  }, []);
  return (
    <StudentFeedbackContext.Provider value={setNotice}>
      <div ref={workspace} className="min-w-0">
        {message ? <p role="alert" className="mb-4 rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm">{message}</p> : null}
        {notice ? <p role="status" className="mb-4 rounded-lg border border-success/30 bg-success/10 p-3 text-sm text-success">{notice}</p> : null}
        {children}
      </div>
    </StudentFeedbackContext.Provider>
  );
}

export function StudentActionForm({ children, pending, feedback, ...props }: ComponentProps<"form"> & {
  pending: boolean;
  feedback: { saved?: boolean; createdStudentId?: string; error: string | null };
}) {
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if ((feedback.saved || feedback.createdStudentId) && form.current) form.current.dataset.dirty = "false";
  }, [feedback]);
  return (
    <form
      {...props}
      ref={form}
      data-pending={pending}
      onChange={() => { if (form.current) form.current.dataset.dirty = "true"; }}
      onInvalidCapture={event => {
        if (!(event.target instanceof HTMLElement)) return;
        let details = event.target.closest("details");
        while (details) {
          details.open = true;
          details = details.parentElement?.closest("details") ?? null;
        }
      }}
    ><fieldset disabled={pending} className="contents">{children}</fieldset></form>
  );
}
