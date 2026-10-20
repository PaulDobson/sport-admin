"use client";

import {
  memo,
  useActionState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";
import Image from "next/image";
import { Dialog } from "@base-ui/react/dialog";
import { Dumbbell, Pencil, Search, Trash2, X } from "lucide-react";
import type { ClassTemplateAdministrationRow } from "@/application/instructor-operations/ports/class-template-administration-port";
import {
  catalogTone,
  catalogImage,
} from "@/presentation/components/catalog-card";
import {
  Button,
  FieldControl,
  Surface,
} from "@/presentation/components/primitives";
import {
  saveClassTemplateAction,
  type ProgrammingActionState,
} from "./programming-actions";

// Maps the catalogTone badge class (text-*) to its bg equivalent for the accent bar.
const accentBarClass: Record<string, string> = {
  "text-primary": "bg-primary",
  "text-info": "bg-info",
  "text-warning": "bg-warning",
  "text-destructive": "bg-destructive",
  "text-success": "bg-success",
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type EditorOperation = "update" | "delete";

type Editor = {
  operation: EditorOperation;
  template: ClassTemplateAdministrationRow;
};

const PAGE_SIZE = 6;

// ---------------------------------------------------------------------------
// ClassCard — memoized so it only re-renders when its own data changes,
// not on every keystroke in the search box.
// ---------------------------------------------------------------------------

type ClassCardProps = {
  template: ClassTemplateAdministrationRow;
  onEdit: (
    template: ClassTemplateAdministrationRow,
    button: HTMLButtonElement,
  ) => void;
  onDelete: (
    template: ClassTemplateAdministrationRow,
    button: HTMLButtonElement,
  ) => void;
};

const ClassCard = memo(function ClassCard({
  template,
  onEdit,
  onDelete,
}: ClassCardProps) {
  const inUse = template.scheduleCount > 0 || template.sessionCount > 0;
  const usageId = `class-usage-${template.id}`;
  const tone = catalogTone(template.disciplineName);
  const accentBar = accentBarClass[tone.badge] ?? "bg-primary";
  const imageSrc = catalogImage(template.disciplineName);

  return (
    <article className="group relative flex min-h-64 flex-col overflow-hidden rounded-xl border border-border/60 bg-card transition-all duration-200 hover:border-primary/40 hover:shadow-xl hover:shadow-black/30 motion-safe:hover:-translate-y-0.5">
      {/* Accent bar — color estable por disciplina */}
      <div
        className={`relative z-10 h-0.5 w-full shrink-0 ${accentBar}`}
        aria-hidden="true"
      />

      {/* Background image */}
      <Image
        src={imageSrc}
        alt=""
        aria-hidden="true"
        fill
        sizes="(min-width: 1280px) 33vw, (min-width: 640px) 50vw, 100vw"
        className="pointer-events-none object-cover opacity-30 mix-blend-luminosity transition-transform duration-500 motion-safe:group-hover:scale-105"
      />

      {/* Color gradient overlay */}
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-0 bg-linear-to-br ${tone.surface} to-card opacity-75`}
      />

      {/* Bottom scrim for text legibility */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-linear-to-t from-background/90 via-background/40 to-transparent"
      />

      {/* Content */}
      <div className="relative z-10 flex flex-1 flex-col p-4">
        {/* Top row: icono + badge horarios */}
        <div className="flex items-start justify-between gap-2">
          <span
            className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg backdrop-blur-sm ring-1 ${tone.icon}`}
          >
            <Dumbbell aria-hidden="true" className="h-4 w-4" />
          </span>
          <span
            className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-semibold backdrop-blur-sm ${tone.icon}`}
          >
            {template.scheduleCount}{" "}
            {template.scheduleCount === 1 ? "horario" : "horarios"}
          </span>
        </div>

        {/* Bottom block — pushed to bottom */}
        <div className="mt-auto space-y-3 pt-6">
          {/* Title */}
          <div>
            <h3 className="truncate text-base font-bold leading-tight text-white">
              {template.name}
            </h3>
            <p className="mt-0.5 text-xs text-white/60">
              {template.disciplineName}
            </p>
          </div>

          {/* Stats pills — frosted glass */}
          <div className="flex flex-wrap gap-1.5">
            <span className="rounded-md border border-white/10 bg-black/35 px-2.5 py-1 text-xs font-semibold tabular-nums text-white/90 backdrop-blur-sm">
              {template.capacity} cupos
            </span>
            <span className="rounded-md border border-white/10 bg-black/35 px-2.5 py-1 text-xs font-semibold tabular-nums text-white/90 backdrop-blur-sm">
              {template.sessionCount}{" "}
              {template.sessionCount === 1 ? "sesión" : "sesiones"}
            </span>
          </div>

          {/* Status pill semántico */}
          <div id={usageId}>
            {inUse ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-warning/40 bg-black/40 px-2.5 py-1 text-xs font-semibold text-warning backdrop-blur-sm">
                <span
                  aria-hidden="true"
                  className="h-1.5 w-1.5 rounded-full bg-warning"
                />
                En uso · no se puede eliminar
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-success/40 bg-black/40 px-2.5 py-1 text-xs font-semibold text-success backdrop-blur-sm">
                <span
                  aria-hidden="true"
                  className="h-1.5 w-1.5 rounded-full bg-success"
                />
                Sin sesiones · eliminable
              </span>
            )}
          </div>

          {/* Actions footer */}
          <div className="flex gap-2 border-t border-white/10 pt-3">
            <Button
              aria-label={`Editar ${template.name}`}
              onClick={(event) => onEdit(template, event.currentTarget)}
              className="h-10 flex-1 border-white/10 bg-black/35 text-xs text-white backdrop-blur-sm hover:bg-black/55"
            >
              <Pencil aria-hidden="true" className="h-3.5 w-3.5" /> Editar
            </Button>
            <Button
              variant="danger"
              aria-label={`Eliminar ${template.name}`}
              aria-describedby={usageId}
              disabled={inUse}
              onClick={(event) => onDelete(template, event.currentTarget)}
              className="h-10 flex-1 text-xs backdrop-blur-sm"
            >
              <Trash2 aria-hidden="true" className="h-3.5 w-3.5" /> Eliminar
            </Button>
          </div>
        </div>
      </div>
    </article>
  );
});

// ---------------------------------------------------------------------------
// ClassesEmptyState — pure presentational, no internal state.
// ---------------------------------------------------------------------------

const ClassesEmptyState = memo(function ClassesEmptyState({
  hasClasses,
  onClear,
}: {
  hasClasses: boolean;
  onClear: () => void;
}) {
  return (
    <div className="mt-4 flex flex-col items-center gap-3 rounded-xl border border-dashed border-border/60 bg-muted/30 px-6 py-10 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20">
        <Dumbbell aria-hidden="true" className="h-6 w-6" />
      </span>
      <h3 className="font-semibold">
        {hasClasses ? "No encontramos clases" : "Todavía no has creado clases"}
      </h3>
      <p className="max-w-xs text-sm text-muted-foreground">
        {hasClasses
          ? "Prueba con otro nombre o busca por disciplina."
          : "Crea tu primera clase para definir la disciplina y los cupos de tus entrenamientos."}
      </p>
      {hasClasses ? (
        <Button className="mt-1 bg-muted/50" onClick={onClear}>
          Limpiar búsqueda
        </Button>
      ) : null}
    </div>
  );
});

// ---------------------------------------------------------------------------
// ClassesPagination — only renders when totalPages > 1.
// ---------------------------------------------------------------------------

const ClassesPagination = memo(function ClassesPagination({
  currentPage,
  totalPages,
  onPrev,
  onNext,
}: {
  currentPage: number;
  totalPages: number;
  onPrev: () => void;
  onNext: () => void;
}) {
  return (
    <nav
      aria-label="Paginación de clases"
      className="mt-4 flex items-center justify-between gap-3 border-t border-white/8 pt-4"
    >
      <Button
        disabled={currentPage === 1}
        onClick={onPrev}
        className="bg-muted/50"
      >
        ← Anterior
      </Button>
      <span className="rounded-md bg-muted px-3 py-1.5 text-sm font-semibold tabular-nums">
        {currentPage} / {totalPages}
      </span>
      <Button
        disabled={currentPage === totalPages}
        onClick={onNext}
        className="bg-muted/50"
      >
        Siguiente →
      </Button>
    </nav>
  );
});

// ---------------------------------------------------------------------------
// ClassEditor — dialog for edit / delete. Isolated state so search box
// changes never trigger a re-render here.
// ---------------------------------------------------------------------------

function ClassEditor({
  editor,
  onClose,
  onSaved,
  opener,
  fallbackFocus,
}: {
  editor: Editor;
  onClose: () => void;
  onSaved: (message: string) => void;
  opener: RefObject<HTMLButtonElement | null>;
  fallbackFocus: RefObject<HTMLInputElement | null>;
}) {
  const { template, operation } = editor;
  const deleting = operation === "delete";
  const [name, setName] = useState(template.name);
  const [capacity, setCapacity] = useState(String(template.capacity));
  const [discarding, setDiscarding] = useState(false);

  const dirty =
    !deleting &&
    (name !== template.name || capacity !== String(template.capacity));

  const nameRef = useRef<HTMLInputElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const continueRef = useRef<HTMLButtonElement>(null);

  const [state, action, pending] = useActionState(
    async (previous: ProgrammingActionState, data: FormData) => {
      const result = await saveClassTemplateAction(previous, data);
      if (result.message) onSaved(result.message);
      return result;
    },
    { error: null, message: null },
  );

  const requestClose = useCallback(() => {
    if (pending) return;
    if (dirty) setDiscarding(true);
    else onClose();
  }, [pending, dirty, onClose]);

  // Focus management on discard confirmation toggle.
  useEffect(() => {
    if (discarding) continueRef.current?.focus();
    else nameRef.current?.focus();
  }, [discarding]);

  // Warn on tab/window close when form is dirty.
  useEffect(() => {
    if (!dirty) return;
    const preventLeaving = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", preventLeaving);
    return () => window.removeEventListener("beforeunload", preventLeaving);
  }, [dirty]);

  const getFinalFocus = () =>
    opener.current?.isConnected ? opener.current : fallbackFocus.current;

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) requestClose();
    },
    [requestClose],
  );

  return (
    <Dialog.Root open onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-[60] bg-black/65 backdrop-blur-sm" />
        <Dialog.Popup
          initialFocus={deleting ? cancelRef : nameRef}
          finalFocus={getFinalFocus}
          className="fixed left-1/2 top-1/2 z-[70] max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-border bg-card p-5 text-foreground shadow-2xl sm:p-7"
        >
          <div className="flex items-start justify-between gap-4">
            <span
              className={`grid h-12 w-12 place-items-center rounded-xl ${
                deleting
                  ? "bg-destructive/10 text-destructive"
                  : "bg-primary/10 text-primary"
              }`}
            >
              {deleting ? (
                <Trash2 aria-hidden="true" />
              ) : (
                <Dumbbell aria-hidden="true" />
              )}
            </span>
            <Button
              variant="quiet"
              aria-label="Cerrar formulario de clase"
              disabled={pending}
              onClick={requestClose}
            >
              <X aria-hidden="true" className="h-4 w-4" />
            </Button>
          </div>

          <Dialog.Title className="mt-4 text-xl font-bold">
            {discarding
              ? "¿Descartar los cambios?"
              : deleting
                ? "Eliminar clase"
                : "Editar clase"}
          </Dialog.Title>

          <Dialog.Description className="mt-2 text-sm leading-6 text-muted-foreground">
            {discarding
              ? "Tienes cambios sin guardar. Puedes seguir editando o descartarlos."
              : deleting
                ? `Vas a eliminar "${template.name}". Esta acción es definitiva. Solo se puede eliminar una clase sin horarios ni sesiones, incluidos los históricos. Su disciplina se conservará.`
                : `Actualiza "${template.name}". Su disciplina, ${template.disciplineName}, se mantiene para conservar la clasificación del historial.`}
          </Dialog.Description>

          {discarding ? (
            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <Button ref={continueRef} onClick={() => setDiscarding(false)}>
                Seguir editando
              </Button>
              <Button variant="danger" onClick={onClose}>
                Descartar cambios
              </Button>
            </div>
          ) : (
            <form action={action} className="mt-6 space-y-5">
              <input type="hidden" name="operation" value={operation} />
              <input type="hidden" name="id" value={template.id} />
              {!deleting ? (
                <>
                  <label className="block space-y-2 text-sm font-semibold">
                    <span>Nombre de la clase</span>
                    <FieldControl
                      ref={nameRef}
                      name="className"
                      required
                      maxLength={100}
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      disabled={pending}
                      autoComplete="off"
                    />
                  </label>
                  <label className="block space-y-2 text-sm font-semibold">
                    <span>Capacidad</span>
                    <FieldControl
                      name="capacity"
                      type="number"
                      min="1"
                      max="500"
                      step="1"
                      required
                      value={capacity}
                      onChange={(event) => setCapacity(event.target.value)}
                      disabled={pending}
                      aria-describedby="class-edit-impact"
                    />
                  </label>
                  <p
                    id="class-edit-impact"
                    className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm leading-6 text-muted-foreground"
                  >
                    El nombre se actualizará donde se muestra esta clase,
                    también en su historial. La capacidad se aplicará solo a las
                    sesiones que publiques después. Las sesiones ya publicadas
                    conservan sus cupos, reservas, fechas e instructores.
                  </p>
                </>
              ) : null}

              {state.error ? (
                <p
                  role="alert"
                  className="rounded-lg border border-destructive/25 bg-destructive/10 p-3 text-sm text-destructive"
                >
                  {state.error}
                </p>
              ) : null}

              <div className="flex flex-wrap justify-end gap-3 border-t border-border pt-5">
                <Button
                  ref={cancelRef}
                  onClick={requestClose}
                  disabled={pending}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  variant={deleting ? "danger" : "primary"}
                  isLoading={pending}
                  disabled={!deleting && !dirty}
                >
                  {pending
                    ? deleting
                      ? "Eliminando…"
                      : "Guardando…"
                    : deleting
                      ? "Eliminar definitivamente"
                      : "Guardar cambios"}
                </Button>
              </div>
            </form>
          )}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// ---------------------------------------------------------------------------
// ClassTemplateAdministrationWorkspace — root component.
// Owns search/page/editor state; delegates rendering to sub-components.
// ---------------------------------------------------------------------------

export function ClassTemplateAdministrationWorkspace({
  classes,
}: {
  classes: ClassTemplateAdministrationRow[];
}) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const opener = useRef<HTMLButtonElement | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Derived state — memoized to avoid recomputing on unrelated renders.
  const query = useMemo(() => search.trim().toLocaleLowerCase("es"), [search]);

  const filtered = useMemo(
    () =>
      classes.filter((template) =>
        `${template.name} ${template.disciplineName}`
          .toLocaleLowerCase("es")
          .includes(query),
      ),
    [classes, query],
  );

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(filtered.length / PAGE_SIZE)),
    [filtered.length],
  );

  const currentPage = Math.min(page, totalPages);

  const rows = useMemo(
    () =>
      filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [filtered, currentPage],
  );

  // Stable callbacks — no inline functions passed to memoized children.
  const handleSearchChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setSearch(event.target.value);
      setPage(1);
    },
    [],
  );

  const handleEdit = useCallback(
    (template: ClassTemplateAdministrationRow, button: HTMLButtonElement) => {
      opener.current = button;
      setMessage(null);
      setEditor({ operation: "update", template });
    },
    [],
  );

  const handleDelete = useCallback(
    (template: ClassTemplateAdministrationRow, button: HTMLButtonElement) => {
      opener.current = button;
      setMessage(null);
      setEditor({ operation: "delete", template });
    },
    [],
  );

  const handleEditorClose = useCallback(() => setEditor(null), []);

  const handleEditorSaved = useCallback((savedMessage: string) => {
    setEditor(null);
    setMessage(savedMessage);
  }, []);

  const handleClearSearch = useCallback(() => {
    setSearch("");
    setPage(1);
    searchRef.current?.focus();
  }, []);

  const handlePrevPage = useCallback(() => setPage((p) => p - 1), []);
  const handleNextPage = useCallback(() => setPage((p) => p + 1), []);

  return (
    <Surface
      id="class-catalog"
      aria-labelledby="class-catalog-heading"
      className="overflow-hidden border-border/80 bg-surface-raised p-0"
    >
      {/* Panel header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/8 bg-muted/50 px-5 py-4">
        <div>
          <h2 id="class-catalog-heading" className="text-lg font-semibold">
            Tus clases
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Edita tu oferta y revisa qué clases están en uso antes de
            eliminarlas.
          </p>
        </div>
        <label className="block w-full sm:max-w-xs">
          <span className="sr-only">Buscar clase</span>
          <span className="relative block">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            />
            <FieldControl
              ref={searchRef}
              type="search"
              value={search}
              onChange={handleSearchChange}
              placeholder="Buscar por nombre o disciplina"
              className="h-10 border-border/60 bg-muted pl-9"
            />
          </span>
        </label>
      </div>

      {/* Panel body */}
      <div className="p-4 sm:p-5">
        {message ? (
          <p
            role="status"
            className="mb-4 rounded-lg border border-success/20 bg-success/10 p-3 text-sm text-success"
          >
            {message}
          </p>
        ) : null}

        <p aria-live="polite" className="text-xs text-muted-foreground">
          {filtered.length} clases · Página {currentPage} de {totalPages}
        </p>

        {rows.length > 0 ? (
          <ul
            aria-label="Clases creadas"
            className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3"
          >
            {rows.map((template) => (
              <li key={template.id} className="min-w-0">
                <ClassCard
                  template={template}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              </li>
            ))}
          </ul>
        ) : (
          <ClassesEmptyState
            hasClasses={classes.length > 0}
            onClear={handleClearSearch}
          />
        )}

        {totalPages > 1 ? (
          <ClassesPagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPrev={handlePrevPage}
            onNext={handleNextPage}
          />
        ) : null}

        {editor ? (
          <ClassEditor
            editor={editor}
            opener={opener}
            fallbackFocus={searchRef}
            onClose={handleEditorClose}
            onSaved={handleEditorSaved}
          />
        ) : null}
      </div>
    </Surface>
  );
}
