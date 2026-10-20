"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Search, UserPlus, X } from "lucide-react";
import { Avatar, Button } from "@/presentation/components/primitives";
import { formatActionError } from "@/app/_lib/format-error";
import { searchAttendanceStudentsAction, type AttendanceStudentSearchState } from "./actions";

type Student = AttendanceStudentSearchState["students"][number];
const initialState: AttendanceStudentSearchState = {
  error: null, students: [], page: 1, total: 0, search: "", searched: false,
};
const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

function Highlight({ name, search }: { name: string; search: string }) {
  const terms = normalize(search).split(/\s+/).filter(Boolean);
  const normalized = normalize(name);
  return <>{Array.from(name).map((character, index) => (
    terms.some((term) => {
      let start = normalized.indexOf(term);
      while (start !== -1) {
        if (index >= start && index < start + term.length) return true;
        start = normalized.indexOf(term, start + 1);
      }
      return false;
    }) ? <mark key={index} className="bg-primary/15 text-primary">{character}</mark> : <span key={index}>{character}</span>
  ))}</>;
}

export function AttendanceStudentPicker({
  selectedIds, disabled, onAdd,
}: {
  selectedIds: Set<string>;
  disabled: boolean;
  onAdd: (students: Student[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selection, setSelection] = useState<Student[]>([]);
  const [state, setState] = useState(initialState);
  const [pending, setPending] = useState(false);
  const [review, setReview] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const request = useRef(0);
  const invalidate = useCallback(() => ++request.current, []);
  const titleId = useId();
  const searchId = useId();

  const load = useCallback(async (query: string, page: number, version: number) => {
    setPending(true);
    try {
      if (!navigator.onLine) throw new Error("La búsqueda necesita conexión.");
      const data = new FormData();
      data.set("search", query);
      data.set("page", String(page));
      const result = await searchAttendanceStudentsAction(initialState, data);
      if (version !== request.current) return;
      setState((previous) => result.error ? {
        ...(previous.search === query ? previous : { ...initialState, search: query }),
        error: result.error,
      } : ({
        ...result,
        students: page === 1 ? result.students : [
          ...previous.students,
          ...result.students.filter((student) => !previous.students.some((item) => item.studentId === student.studentId)),
        ],
      }));
    } catch (error) {
      if (version !== request.current) return;
      const message = !navigator.onLine
        ? "La búsqueda necesita conexión. Los resultados cargados no representan todo el padrón."
        : formatActionError(error);
      setState((previous) => ({ ...previous, error: message }));
    } finally {
      if (version === request.current) setPending(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    const panel = dialog.current;
    const opener = trigger.current;
    panel?.showModal();
    input.current?.focus();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const viewport = window.visualViewport;
    const resize = () => {
      panel?.style.setProperty("--picker-height", `${viewport?.height ?? window.innerHeight}px`);
      panel?.style.setProperty("--picker-top", `${viewport?.offsetTop ?? 0}px`);
    };
    resize();
    viewport?.addEventListener("resize", resize);
    viewport?.addEventListener("scroll", resize);
    return () => {
      invalidate();
      panel?.close();
      document.body.style.overflow = previous;
      viewport?.removeEventListener("resize", resize);
      viewport?.removeEventListener("scroll", resize);
      opener?.focus();
    };
  }, [open, invalidate]);

  useEffect(() => {
    const version = ++request.current;
    if (!open || search.trim().length < 2) return;
    const timer = setTimeout(() => void load(search.trim(), 1, version), 275);
    return () => { clearTimeout(timer); };
  }, [search, open, load]);

  const close = () => { request.current++; setOpen(false); setSelection([]); };
  const chosen = selection.filter((student) => !selectedIds.has(student.studentId));
  const visible = review ? chosen : state.students;
  const matchesQuery = state.search === search.trim();

  return (
    <div className="mb-5">
      <Button ref={trigger} disabled={disabled} onClick={() => {
        setSearch(""); setState(initialState); setSelection([]); setReview(false); setPending(false); setOpen(true);
      }} className="min-h-11" aria-haspopup="dialog">
        <UserPlus aria-hidden="true" className="h-4 w-4" /> Añadir alumnos sin reserva
      </Button>
      {open ? (
        <dialog ref={dialog} aria-labelledby={titleId} onCancel={(event) => { event.preventDefault(); close(); }}
          onClick={(event) => { if (event.target === event.currentTarget) close(); }}
          onKeyDown={(event) => {
            if (event.key !== "Tab") return;
            const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>(':is(button,input):not(:disabled)'));
            const first = controls[0], last = controls[controls.length - 1];
            if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
            if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
          }}
          className="fixed inset-x-0 bottom-auto top-[var(--picker-top,0px)] m-0 h-[var(--picker-height,100dvh)] max-h-none w-full max-w-none border-0 bg-card p-0 text-foreground shadow-2xl backdrop:bg-black/65 sm:inset-0 sm:m-auto sm:h-[min(44rem,calc(var(--picker-height,100dvh)-2rem))] sm:max-w-xl sm:rounded-2xl sm:border sm:border-border"
        >
          <div className="flex h-full min-h-0 flex-col">
            <header className="shrink-0 border-b border-border p-4 sm:p-5">
              <div className="flex items-center justify-between gap-3">
                <h2 id={titleId} className="text-lg font-semibold">Añadir alumnos sin reserva</h2>
                <Button aria-label="Cerrar selector" variant="quiet" onClick={close} className="h-11 w-11 shrink-0 p-0"><X aria-hidden="true" className="h-5 w-5" /></Button>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">Se añadirán como presentes. Guarda después la asistencia; las reservas y los cupos no cambian.</p>
              <label htmlFor={searchId} className="sr-only">Buscar por nombre o apellido</label>
              <div className="mt-4 flex items-center gap-2 rounded-lg border border-input bg-background px-3">
                <Search aria-hidden="true" className="h-5 w-5 shrink-0 text-muted-foreground" />
                <input ref={input} id={searchId} type="search" autoComplete="off" maxLength={100} value={search}
                  onChange={(event) => {
                    request.current++; setPending(false); setSearch(event.target.value); setReview(false);
                  }}
                  placeholder="Nombre o apellido…" className="h-11 min-w-0 flex-1 bg-transparent text-sm outline-none" />
              </div>
              <div className="mt-3 flex items-center justify-between text-xs">
                <span role="status" className="text-muted-foreground">{pending ? "Buscando…" : matchesQuery && state.searched ? `${state.total} coincidencias` : "Escribe al menos 2 caracteres"}</span>
                {review || chosen.length ? <button type="button" onClick={() => setReview(!review)} className="min-h-11 px-2 font-semibold text-primary">{review ? "Ver resultados" : `Revisar selección (${chosen.length})`}</button> : null}
              </div>
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 sm:px-5">
              {state.error ? <div role="alert" className="py-3 text-sm text-destructive">{state.error}
                <Button onClick={() => void load(search.trim(), matchesQuery ? state.page : 1, ++request.current)} disabled={pending || search.trim().length < 2} className="ml-2 min-h-11">Reintentar</Button>
              </div> : null}
              {!review && !matchesQuery && !pending ? <p className="py-6 text-sm text-muted-foreground">Busca entre los alumnos activos de la academia.</p> : null}
              {!review && matchesQuery && state.searched && !state.error && !pending && !visible.length ? <p className="py-6 text-sm text-muted-foreground">No se encontraron alumnos. Prueba con otro nombre o apellido.</p> : null}
              {(review || matchesQuery) ? <ul className="divide-y divide-border">
                {visible.map((student) => {
                  const existing = selectedIds.has(student.studentId);
                  const checked = chosen.some((item) => item.studentId === student.studentId);
                  return <li key={student.studentId}>
                    <label className={`flex min-h-16 items-center gap-3 py-3 ${existing ? "opacity-60" : "cursor-pointer"}`}>
                      <Avatar name={student.studentName} size="sm" />
                      <span className="min-w-0 flex-1">
                        <span className="block wrap-break-word text-sm font-medium"><Highlight name={student.studentName} search={search} /></span>
                        <span className="mt-1 block text-xs text-muted-foreground" title={student.studentId}>Ref. {student.studentId.slice(0, 8)}</span>
                      </span>
                      {existing ? <span className="text-xs text-muted-foreground">Ya en lista</span> : null}
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center">
                        <input type="checkbox" disabled={existing || disabled} checked={existing || checked}
                          aria-label={`${review ? "Seleccionado" : "Seleccionar"}: ${student.studentName}`}
                          onChange={() => setSelection((items) => checked ? items.filter((item) => item.studentId !== student.studentId) : [...items, student])}
                          className="h-5 w-5 accent-primary" />
                      </span>
                    </label>
                  </li>;
                })}
              </ul> : null}
              {!review && matchesQuery && state.students.length < state.total ? <Button disabled={pending} onClick={() => void load(search.trim(), state.page + 1, ++request.current)} className="my-4 min-h-11 w-full">{pending ? "Cargando…" : "Cargar más"}</Button> : null}
            </div>
            <footer className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-border bg-card p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
              <p className="text-sm text-muted-foreground">{chosen.length} seleccionados</p>
              <Button variant="primary" disabled={disabled || !chosen.length} onClick={() => { onAdd(chosen); close(); }} className="min-h-11">
                Añadir {chosen.length} a la lista
              </Button>
            </footer>
          </div>
        </dialog>
      ) : null}
    </div>
  );
}
