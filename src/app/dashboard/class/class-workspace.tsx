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
import {
  Archive,
  Check,
  ChevronDown,
  Dumbbell,
  LayoutGrid,
  LayoutList,
  Pencil,
  Plus,
  Search,
  Table2,
  Tags,
  Trash2,
  X,
} from "lucide-react";
import type { ClassTemplateAdministrationRow } from "@/application/instructor-operations/ports/class-template-administration-port";
import type { DisciplineOption } from "@/application/instructor-operations/ports/schedule-catalog-port";
import type { ClassTemplateOption } from "@/application/instructor-operations/ports/schedule-catalog-port";
import {
  catalogTone,
  catalogImage,
} from "@/presentation/components/catalog-card";
import {
  Button,
  FieldControl,
  Surface,
  StatusBadge,
} from "@/presentation/components/primitives";
import {
  saveClassTemplateAction,
  createClassTemplateAction,
  createDisciplineAction,
  type ProgrammingActionState,
} from "@/app/dashboard/schedule/programming-actions";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PAGE_SIZE = 9;

const DISCIPLINE_PRESETS = [
  "Boxeo",
  "Taekwondo",
  "Yoga",
  "Pilates",
  "CrossFit",
  "Fútbol",
  "Natación",
  "Karate",
  "Defensa personal",
  "Personalizado",
] as const;

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

type ViewMode = "cards" | "table";
type EditorOperation = "create" | "update" | "delete";

type ClassEditor =
  | { operation: "create" }
  | {
      operation: "update" | "delete";
      template: ClassTemplateAdministrationRow;
    };

type DisciplineEditorState = { mode: "hidden" } | { mode: "visible" };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mergeCreated<T extends { id: string }>(catalog: T[], created: T[]) {
  if (created.length === 0) return catalog;
  const existingIds = new Set(catalog.map((item) => item.id));
  const novel = created.filter((item) => !existingIds.has(item.id));
  return novel.length === 0 ? catalog : [...catalog, ...novel];
}

function normalise(s: string) {
  return s.trim().toLocaleLowerCase("es");
}

// ---------------------------------------------------------------------------
// DisciplineInlineForm — collapsible drawer to add a discipline on the fly
// ---------------------------------------------------------------------------

const DisciplineInlineForm = memo(function DisciplineInlineForm({
  open,
  onToggle,
  onCreated,
  existingNames,
}: {
  open: boolean;
  onToggle: () => void;
  onCreated: (value: DisciplineOption) => void;
  existingNames: string[];
}) {
  const [name, setName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const isDuplicate = existingNames.some(
    (n) => normalise(n) === normalise(name),
  );

  const [state, action, pending] = useActionState(
    async (previous: ProgrammingActionState, data: FormData) => {
      const result = await createDisciplineAction(previous, data);
      if (result.created) {
        onCreated(result.created);
        setName("");
      }
      return result;
    },
    { error: null, message: null },
  );

  // Auto-focus the input when the drawer opens
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 60);
  }, [open]);

  return (
    <div className="overflow-hidden rounded-xl border border-border/70 bg-card transition-all">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary"
      >
        <span className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
            <Tags aria-hidden="true" className="h-4 w-4" />
          </span>
          <span>
            <span className="block text-sm font-semibold text-foreground">
              Nueva disciplina
            </span>
            <span className="block text-xs text-muted-foreground">
              Agrupa tus clases por actividad
            </span>
          </span>
        </span>
        <ChevronDown
          aria-hidden="true"
          className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open ? (
        <div className="border-t border-border px-4 pb-4 pt-3">
          {/* Preset chips */}
          <div
            role="group"
            aria-label="Disciplinas sugeridas"
            className="flex flex-wrap gap-1.5"
          >
            {DISCIPLINE_PRESETS.map((preset) => {
              const selected = normalise(name) === normalise(preset);
              const alreadyExists = existingNames.some(
                (n) => normalise(n) === normalise(preset),
              );
              return (
                <button
                  key={preset}
                  type="button"
                  disabled={pending || alreadyExists}
                  aria-pressed={selected}
                  title={
                    alreadyExists ? "Ya existe esta disciplina" : undefined
                  }
                  onClick={() => setName(selected ? "" : preset)}
                  className={[
                    "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                    "disabled:cursor-not-allowed disabled:opacity-45",
                    selected
                      ? "border-primary bg-primary text-primary-foreground"
                      : alreadyExists
                        ? "border-border bg-muted text-muted-foreground line-through"
                        : "border-border bg-surface-raised text-foreground hover:border-primary/50 hover:bg-primary/8 hover:text-primary",
                  ].join(" ")}
                >
                  {preset}
                  {alreadyExists ? (
                    <Check
                      aria-hidden="true"
                      className="ml-1 h-3 w-3 text-success"
                    />
                  ) : null}
                </button>
              );
            })}
          </div>

          <form action={action} className="mt-3 flex gap-2">
            <label className="relative flex-1">
              <span className="sr-only">Nombre de la disciplina</span>
              <input
                ref={inputRef}
                name="name"
                required
                maxLength={100}
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={pending}
                placeholder="Ej. Pilates, CrossFit…"
                className="h-10 w-full rounded-lg border border-input bg-background/50 px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-45"
              />
              {isDuplicate && name.trim() ? (
                <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-warning">
                  Ya existe
                </span>
              ) : null}
            </label>
            <Button
              type="submit"
              variant="primary"
              isLoading={pending}
              disabled={!name.trim() || isDuplicate}
              aria-disabled={isDuplicate}
              className="shrink-0"
            >
              <Plus aria-hidden="true" className="h-4 w-4" />
              <span className="hidden sm:inline">Crear</span>
            </Button>
          </form>

          {state.error ? (
            <p role="alert" className="mt-2 text-xs text-destructive">
              {state.error}
            </p>
          ) : state.message ? (
            <p role="status" className="mt-2 text-xs text-success">
              {state.message}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
});

// ---------------------------------------------------------------------------
// ClassCreationForm — inline form to create a class
// ---------------------------------------------------------------------------

const ClassCreationForm = memo(function ClassCreationForm({
  disciplines,
  existingClassNames,
  open,
  onToggle,
  onCreated,
  onNeedDiscipline,
}: {
  disciplines: DisciplineOption[];
  existingClassNames: string[];
  open: boolean;
  onToggle: () => void;
  onCreated: (value: ClassTemplateOption) => void;
  onNeedDiscipline: () => void;
}) {
  const [disciplineId, setDisciplineId] = useState(disciplines[0]?.id ?? "");
  const [name, setName] = useState("");
  const [capacity, setCapacity] = useState("16");
  const inputRef = useRef<HTMLInputElement>(null);

  const isDuplicate = existingClassNames.some(
    (n) => normalise(n) === normalise(name),
  );

  // Keep disciplineId in sync when disciplines list changes.
  // Uses the "adjust state during render" pattern to avoid calling setState
  // synchronously inside an effect body (react-hooks/set-state-in-effect).
  const [prevDisciplines, setPrevDisciplines] = useState(disciplines);
  if (
    prevDisciplines !== disciplines &&
    disciplines.length > 0 &&
    !disciplines.find((d) => d.id === disciplineId)
  ) {
    setPrevDisciplines(disciplines);
    setDisciplineId(disciplines[0]?.id ?? "");
  } else if (prevDisciplines !== disciplines) {
    setPrevDisciplines(disciplines);
  }

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 60);
  }, [open]);

  const [state, action, pending] = useActionState(
    async (previous: ProgrammingActionState, data: FormData) => {
      const result = await createClassTemplateAction(previous, data);
      if (result.created) {
        onCreated({
          ...result.created,
          disciplineName:
            disciplines.find((d) => d.id === disciplineId)?.name ?? "",
          capacity: Number(capacity),
        });
        setName("");
        setCapacity("16");
      }
      return result;
    },
    { error: null, message: null },
  );

  const noDisciplines = disciplines.length === 0;

  return (
    <div className="overflow-hidden rounded-xl border border-border/70 bg-card transition-all">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary"
      >
        <span className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
            <Dumbbell aria-hidden="true" className="h-4 w-4" />
          </span>
          <span>
            <span className="block text-sm font-semibold text-foreground">
              Nueva clase
            </span>
            <span className="block text-xs text-muted-foreground">
              Define nombre, disciplina y cupos
            </span>
          </span>
        </span>
        <ChevronDown
          aria-hidden="true"
          className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open ? (
        <div className="border-t border-border px-4 pb-4 pt-3">
          {noDisciplines ? (
            <div className="rounded-lg border border-warning/30 bg-warning/8 px-3 py-2.5">
              <p className="text-xs font-semibold text-warning">
                Necesitas al menos una disciplina.
              </p>
              <button
                type="button"
                onClick={onNeedDiscipline}
                className="mt-1 text-xs font-semibold text-primary underline underline-offset-2 hover:no-underline"
              >
                Crear una disciplina ahora →
              </button>
            </div>
          ) : (
            <form action={action} className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                {/* Discipline */}
                <label className="flex flex-col gap-1.5 text-xs font-semibold">
                  <span>Disciplina</span>
                  <select
                    name="disciplineId"
                    required
                    value={disciplineId}
                    onChange={(e) => setDisciplineId(e.target.value)}
                    disabled={pending}
                    className="h-10 w-full rounded-lg border border-input bg-background/50 px-3 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-45"
                  >
                    <option value="">Selecciona…</option>
                    {disciplines.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </label>

                {/* Capacity */}
                <label className="flex flex-col gap-1.5 text-xs font-semibold">
                  <span>Capacidad</span>
                  <input
                    name="capacity"
                    type="number"
                    min={1}
                    max={500}
                    step={1}
                    required
                    value={capacity}
                    onChange={(e) => setCapacity(e.target.value)}
                    disabled={pending}
                    className="h-10 w-full rounded-lg border border-input bg-background/50 px-3 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-45"
                  />
                </label>
              </div>

              {/* Name */}
              <label className="flex flex-col gap-1.5 text-xs font-semibold">
                <span>Nombre de la clase</span>
                <div className="relative">
                  <input
                    ref={inputRef}
                    name="className"
                    required
                    maxLength={100}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={pending}
                    placeholder="Yoga inicial, Boxeo avanzado…"
                    className="h-10 w-full rounded-lg border border-input bg-background/50 px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-45"
                  />
                  {isDuplicate && name.trim() ? (
                    <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-warning">
                      Nombre duplicado
                    </span>
                  ) : null}
                </div>
              </label>

              {state.error ? (
                <p role="alert" className="text-xs text-destructive">
                  {state.error}
                </p>
              ) : state.message ? (
                <p role="status" className="text-xs text-success">
                  {state.message}
                </p>
              ) : null}

              <Button
                type="submit"
                variant="primary"
                isLoading={pending}
                disabled={!name.trim() || isDuplicate || !disciplineId}
                className="w-full sm:w-auto"
              >
                <Plus aria-hidden="true" className="h-4 w-4" />
                Crear clase
              </Button>
            </form>
          )}
        </div>
      ) : null}
    </div>
  );
});

// ---------------------------------------------------------------------------
// ClassCard — memoized card view item
// ---------------------------------------------------------------------------

type ClassCardProps = {
  template: ClassTemplateAdministrationRow;
  onEdit: (t: ClassTemplateAdministrationRow, b: HTMLButtonElement) => void;
  onDelete: (t: ClassTemplateAdministrationRow, b: HTMLButtonElement) => void;
};

const ClassCard = memo(function ClassCard({
  template,
  onEdit,
  onDelete,
}: ClassCardProps) {
  const inUse = template.scheduleCount > 0 || template.sessionCount > 0;
  const tone = catalogTone(template.disciplineName);
  const accentBar = accentBarClass[tone.badge] ?? "bg-primary";
  const imageSrc = catalogImage(template.disciplineName);

  return (
    <article className="group relative flex min-h-52 flex-col overflow-hidden rounded-xl border border-border/60 bg-card transition-all duration-200 hover:border-primary/40 hover:shadow-xl hover:shadow-black/30 motion-safe:hover:-translate-y-0.5">
      <div
        className={`relative z-10 h-0.5 w-full shrink-0 ${accentBar}`}
        aria-hidden="true"
      />
      <Image
        src={imageSrc}
        alt=""
        aria-hidden="true"
        fill
        sizes="(min-width: 1280px) 33vw, (min-width: 640px) 50vw, 100vw"
        className="pointer-events-none object-cover opacity-30 mix-blend-luminosity transition-transform duration-500 motion-safe:group-hover:scale-105"
      />
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-0 bg-linear-to-br ${tone.surface} to-card opacity-75`}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-linear-to-t from-background/90 via-background/40 to-transparent"
      />

      <div className="relative z-10 flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-2">
          <span
            className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg backdrop-blur-sm ring-1 ${tone.icon}`}
          >
            <Dumbbell aria-hidden="true" className="h-4 w-4" />
          </span>
          <span
            className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-semibold backdrop-blur-sm ${tone.icon}`}
          >
            {template.scheduleCount}{" "}
            {template.scheduleCount === 1 ? "horario" : "horarios"}
          </span>
        </div>

        <div className="mt-auto space-y-2.5 pt-5">
          <div>
            <h3 className="truncate text-sm font-bold leading-tight text-white">
              {template.name}
            </h3>
            <p className="mt-0.5 text-xs text-white/60">
              {template.disciplineName}
            </p>
          </div>

          <div className="flex flex-wrap gap-1.5">
            <span className="rounded-md border border-white/10 bg-black/35 px-2 py-0.5 text-xs font-semibold tabular-nums text-white/90 backdrop-blur-sm">
              {template.capacity} cupos
            </span>
            <span className="rounded-md border border-white/10 bg-black/35 px-2 py-0.5 text-xs font-semibold tabular-nums text-white/90 backdrop-blur-sm">
              {template.sessionCount}{" "}
              {template.sessionCount === 1 ? "sesión" : "sesiones"}
            </span>
          </div>

          <div className="flex gap-1.5 border-t border-white/10 pt-2.5">
            <Button
              aria-label={`Editar ${template.name}`}
              onClick={(e) => onEdit(template, e.currentTarget)}
              className="h-8 flex-1 border-white/10 bg-black/35 px-2 text-xs text-white backdrop-blur-sm hover:bg-black/55"
            >
              <Pencil aria-hidden="true" className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Editar</span>
            </Button>
            <Button
              variant="danger"
              aria-label={`Eliminar ${template.name}`}
              disabled={inUse}
              title={
                inUse
                  ? "Tiene horarios o sesiones. Archiva la clase para retirarla."
                  : "Eliminar clase"
              }
              onClick={(e) => onDelete(template, e.currentTarget)}
              className="h-8 flex-1 px-2 text-xs backdrop-blur-sm"
            >
              <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Eliminar</span>
            </Button>
          </div>
        </div>
      </div>
    </article>
  );
});

// ---------------------------------------------------------------------------
// ClassTableRow — single row used in table view
// ---------------------------------------------------------------------------

const ClassTableRow = memo(function ClassTableRow({
  template,
  onEdit,
  onDelete,
}: ClassCardProps) {
  const inUse = template.scheduleCount > 0 || template.sessionCount > 0;
  const tone = catalogTone(template.disciplineName);
  const accentBar = accentBarClass[tone.badge] ?? "bg-primary";

  return (
    <tr className="group border-b border-white/6 last:border-b-0 hover:bg-surface-raised/40">
      <td className="py-3 pl-4 pr-3 align-middle">
        <div className="flex items-center gap-2.5">
          <span
            className={`h-5 w-1 shrink-0 rounded-full ${accentBar}`}
            aria-hidden="true"
          />
          <span className="font-semibold text-foreground">{template.name}</span>
        </div>
      </td>
      <td className="px-3 py-3 align-middle text-sm text-muted-foreground">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${tone.icon}`}
        >
          <Dumbbell aria-hidden="true" className="h-3 w-3" />
          {template.disciplineName}
        </span>
      </td>
      <td className="px-3 py-3 align-middle text-sm tabular-nums text-foreground">
        {template.capacity}
      </td>
      <td className="px-3 py-3 align-middle text-sm tabular-nums text-muted-foreground">
        {template.scheduleCount}
      </td>
      <td className="px-3 py-3 align-middle text-sm tabular-nums text-muted-foreground">
        {template.sessionCount}
      </td>
      <td className="py-3 pl-3 pr-4 align-middle">
        <div className="flex items-center justify-end gap-1.5">
          <Button
            aria-label={`Editar ${template.name}`}
            onClick={(e) => onEdit(template, e.currentTarget)}
            className="h-8 px-2.5 text-xs"
          >
            <Pencil aria-hidden="true" className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="danger"
            aria-label={`Eliminar ${template.name}`}
            disabled={inUse}
            title={
              inUse ? "Tiene horarios o sesiones activas" : "Eliminar clase"
            }
            onClick={(e) => onDelete(template, e.currentTarget)}
            className="h-8 px-2.5 text-xs"
          >
            <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
          </Button>
        </div>
      </td>
    </tr>
  );
});

// ---------------------------------------------------------------------------
// ClassEditor — dialog for edit / delete
// ---------------------------------------------------------------------------

function ClassEditorDialog({
  editor,
  onClose,
  onSaved,
  opener,
  fallbackFocus,
  existingClassNames,
}: {
  editor: ClassEditor;
  onClose: () => void;
  onSaved: (message: string) => void;
  opener: RefObject<HTMLButtonElement | null>;
  fallbackFocus: RefObject<HTMLElement | null>;
  existingClassNames: string[];
}) {
  const template = editor.operation === "create" ? null : editor.template;
  const deleting = editor.operation === "delete";

  const [name, setName] = useState(template?.name ?? "");
  const [capacity, setCapacity] = useState(
    template ? String(template.capacity) : "16",
  );
  const [discarding, setDiscarding] = useState(false);

  const dirty =
    !deleting &&
    editor.operation !== "create" &&
    (name !== template?.name || capacity !== String(template?.capacity));

  const isDuplicate =
    !deleting &&
    name.trim() !== template?.name &&
    existingClassNames.some((n) => normalise(n) === normalise(name));

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

  useEffect(() => {
    if (discarding) continueRef.current?.focus();
    else nameRef.current?.focus();
  }, [discarding]);

  useEffect(() => {
    if (!dirty) return;
    const prevent = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", prevent);
    return () => window.removeEventListener("beforeunload", prevent);
  }, [dirty]);

  const getFinalFocus = () =>
    opener.current?.isConnected ? opener.current : fallbackFocus.current;

  return (
    <Dialog.Root
      open
      onOpenChange={(open) => {
        if (!open) requestClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-[60] bg-black/65 backdrop-blur-sm" />
        <Dialog.Popup
          initialFocus={deleting ? cancelRef : nameRef}
          finalFocus={getFinalFocus}
          className="fixed left-1/2 top-1/2 z-[70] max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-border bg-card p-5 text-foreground shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <span
              className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${deleting ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"}`}
            >
              {deleting ? (
                <Trash2 aria-hidden="true" className="h-5 w-5" />
              ) : (
                <Dumbbell aria-hidden="true" className="h-5 w-5" />
              )}
            </span>
            <Button
              variant="quiet"
              aria-label="Cerrar"
              disabled={pending}
              onClick={requestClose}
            >
              <X aria-hidden="true" className="h-4 w-4" />
            </Button>
          </div>

          <Dialog.Title className="mt-3 text-lg font-bold">
            {discarding
              ? "¿Descartar los cambios?"
              : deleting
                ? "Eliminar clase"
                : "Editar clase"}
          </Dialog.Title>
          <Dialog.Description className="mt-1.5 text-sm leading-6 text-muted-foreground">
            {discarding
              ? "Tienes cambios sin guardar. ¿Continúas editando o los descartas?"
              : deleting
                ? `Vas a eliminar "${template?.name}". Esta acción es definitiva.`
                : `Actualiza "${template?.name}". Su disciplina se mantiene para conservar el historial.`}
          </Dialog.Description>

          {discarding ? (
            <div className="mt-5 flex flex-wrap justify-end gap-2.5">
              <Button ref={continueRef} onClick={() => setDiscarding(false)}>
                Seguir editando
              </Button>
              <Button variant="danger" onClick={onClose}>
                Descartar
              </Button>
            </div>
          ) : (
            <form action={action} className="mt-5 space-y-4">
              <input type="hidden" name="operation" value={editor.operation} />
              {template ? (
                <input type="hidden" name="id" value={template.id} />
              ) : null}

              {!deleting ? (
                <>
                  <label className="block space-y-1.5 text-sm font-semibold">
                    <span>Nombre de la clase</span>
                    <div className="relative">
                      <FieldControl
                        ref={nameRef}
                        name="className"
                        required
                        maxLength={100}
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        disabled={pending}
                        autoComplete="off"
                      />
                      {isDuplicate ? (
                        <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-warning">
                          Nombre duplicado
                        </span>
                      ) : null}
                    </div>
                  </label>
                  <label className="block space-y-1.5 text-sm font-semibold">
                    <span>Capacidad</span>
                    <FieldControl
                      name="capacity"
                      type="number"
                      min="1"
                      max="500"
                      step="1"
                      required
                      value={capacity}
                      onChange={(e) => setCapacity(e.target.value)}
                      disabled={pending}
                    />
                  </label>
                  <p className="rounded-lg border border-primary/20 bg-primary/5 p-2.5 text-xs leading-5 text-muted-foreground">
                    La capacidad aplica solo a sesiones nuevas. Las ya
                    publicadas conservan sus cupos.
                  </p>
                </>
              ) : null}

              {state.error ? (
                <p
                  role="alert"
                  className="rounded-lg border border-destructive/25 bg-destructive/10 p-2.5 text-xs text-destructive"
                >
                  {state.error}
                </p>
              ) : null}

              <div className="flex flex-wrap justify-end gap-2.5 border-t border-border pt-4">
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
                  disabled={(!deleting && !dirty) || isDuplicate}
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
// ClassCatalog — search + view toggle + list/table
// ---------------------------------------------------------------------------

function ClassCatalog({
  classes,
  onAddClass,
}: {
  classes: ClassTemplateAdministrationRow[];
  onAddClass: () => void;
}) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState<ViewMode>("cards");
  const [editor, setEditor] = useState<ClassEditor | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const opener = useRef<HTMLButtonElement | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const catalogRef = useRef<HTMLElement | null>(null);

  const query = useMemo(() => normalise(search), [search]);

  const filtered = useMemo(
    () =>
      classes.filter((t) =>
        `${t.name} ${t.disciplineName}`.toLocaleLowerCase("es").includes(query),
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

  const existingNames = useMemo(() => classes.map((c) => c.name), [classes]);

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearch(e.target.value);
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

  const handleClose = useCallback(() => setEditor(null), []);
  const handleSaved = useCallback((msg: string) => {
    setEditor(null);
    setMessage(msg);
  }, []);

  const clearSearch = useCallback(() => {
    setSearch("");
    setPage(1);
    searchRef.current?.focus();
  }, []);

  return (
    <Surface
      aria-label="Catálogo de clases"
      className="overflow-hidden border-border/80 bg-surface-raised p-0"
    >
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 border-b border-white/8 bg-muted/40 px-4 py-3 sm:px-5">
        {/* Search */}
        <label className="relative flex-1" style={{ minWidth: 180 }}>
          <span className="sr-only">Buscar clase o disciplina</span>
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          />
          <FieldControl
            ref={searchRef}
            type="search"
            value={search}
            onChange={handleSearchChange}
            placeholder="Buscar clase o disciplina…"
            className="h-9 border-border/60 bg-background/70 pl-9 text-sm"
          />
        </label>

        {/* View toggle */}
        <div
          role="group"
          aria-label="Vista"
          className="flex overflow-hidden rounded-lg border border-border"
        >
          <button
            type="button"
            aria-pressed={viewMode === "cards"}
            aria-label="Vista en tarjetas"
            onClick={() => setViewMode("cards")}
            className={`inline-flex h-9 w-9 items-center justify-center transition-colors ${viewMode === "cards" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-surface-raised"}`}
          >
            <LayoutGrid aria-hidden="true" className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-pressed={viewMode === "table"}
            aria-label="Vista en tabla"
            onClick={() => setViewMode("table")}
            className={`inline-flex h-9 w-9 items-center justify-center border-l border-border transition-colors ${viewMode === "table" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-surface-raised"}`}
          >
            <Table2 aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>

        {/* Add class shortcut */}
        <Button
          variant="primary"
          onClick={onAddClass}
          className="h-9 shrink-0 text-sm"
        >
          <Plus aria-hidden="true" className="h-4 w-4" />
          <span className="hidden sm:inline">Nueva clase</span>
        </Button>
      </div>

      {/* Meta + success message */}
      <div className="px-4 pt-3 sm:px-5">
        {message ? (
          <p
            role="status"
            className="mb-3 flex items-center gap-2 rounded-lg border border-success/25 bg-success/10 px-3 py-2 text-xs text-success"
          >
            <Check aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
            {message}
          </p>
        ) : null}
        <p aria-live="polite" className="text-xs text-muted-foreground">
          {filtered.length === classes.length
            ? `${classes.length} ${classes.length === 1 ? "clase" : "clases"}`
            : `${filtered.length} de ${classes.length} clases`}
          {totalPages > 1 ? ` · Página ${currentPage} / ${totalPages}` : ""}
        </p>
      </div>

      {/* Content */}
      <div
        className="p-4 sm:p-5"
        ref={catalogRef as React.RefObject<HTMLDivElement>}
      >
        {rows.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border/60 bg-muted/30 px-6 py-10 text-center">
            <span className="grid h-12 w-12 place-items-center rounded-xl bg-primary/10 text-primary">
              <Dumbbell aria-hidden="true" className="h-6 w-6" />
            </span>
            <h3 className="font-semibold">
              {classes.length > 0 ? "Sin resultados" : "Aún no hay clases"}
            </h3>
            <p className="max-w-xs text-sm text-muted-foreground">
              {classes.length > 0
                ? "Prueba otro nombre o disciplina."
                : "Crea tu primera clase con el formulario de arriba."}
            </p>
            {search ? (
              <Button onClick={clearSearch} className="bg-muted/50">
                Limpiar búsqueda
              </Button>
            ) : (
              <Button variant="primary" onClick={onAddClass}>
                <Plus aria-hidden="true" className="h-4 w-4" />
                Nueva clase
              </Button>
            )}
          </div>
        ) : viewMode === "cards" ? (
          <ul
            aria-label="Clases"
            className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3"
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
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <caption className="sr-only">Clases creadas</caption>
              <thead>
                <tr className="border-b border-white/8">
                  <th
                    scope="col"
                    className="py-2.5 pl-4 pr-3 text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground"
                  >
                    Clase
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground"
                  >
                    Disciplina
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground"
                  >
                    <span title="Capacidad máxima por sesión">Cupos</span>
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground"
                  >
                    Horarios
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground"
                  >
                    Sesiones
                  </th>
                  <th scope="col" className="py-2.5 pl-3 pr-4">
                    <span className="sr-only">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((template) => (
                  <ClassTableRow
                    key={template.id}
                    template={template}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 ? (
          <nav
            aria-label="Paginación de clases"
            className="mt-4 flex items-center justify-between gap-3 border-t border-white/8 pt-4"
          >
            <Button
              disabled={currentPage === 1}
              onClick={() => setPage((p) => p - 1)}
              className="bg-muted/50"
            >
              ← Anterior
            </Button>
            <span className="rounded-md bg-muted px-3 py-1.5 text-sm font-semibold tabular-nums">
              {currentPage} / {totalPages}
            </span>
            <Button
              disabled={currentPage === totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="bg-muted/50"
            >
              Siguiente →
            </Button>
          </nav>
        ) : null}
      </div>

      {/* Editor dialog */}
      {editor ? (
        <ClassEditorDialog
          editor={editor}
          onClose={handleClose}
          onSaved={handleSaved}
          opener={opener}
          fallbackFocus={catalogRef as RefObject<HTMLElement | null>}
          existingClassNames={existingNames}
        />
      ) : null}
    </Surface>
  );
}

// ---------------------------------------------------------------------------
// ClassWorkspace — root client component
// ---------------------------------------------------------------------------

export function ClassWorkspace({
  classes,
  disciplines,
}: {
  classes: ClassTemplateAdministrationRow[];
  disciplines: DisciplineOption[];
}) {
  const [createdDisciplines, setCreatedDisciplines] = useState<
    DisciplineOption[]
  >([]);
  const [createdClasses, setCreatedClasses] = useState<ClassTemplateOption[]>(
    [],
  );
  const [disciplineOpen, setDisciplineOpen] = useState(false);
  const [classOpen, setClassOpen] = useState(classes.length === 0);

  const allDisciplines = useMemo(
    () => mergeCreated(disciplines, createdDisciplines),
    [disciplines, createdDisciplines],
  );

  const allClasses = useMemo(
    () =>
      mergeCreated(
        classes,
        createdClasses.map((c) => ({
          ...c,
          scheduleCount: 0,
          sessionCount: 0,
        })),
      ),
    [classes, createdClasses],
  );

  const allClassNames = useMemo(
    () => allClasses.map((c) => c.name),
    [allClasses],
  );

  const allDisciplineNames = useMemo(
    () => allDisciplines.map((d) => d.name),
    [allDisciplines],
  );

  const onDisciplineCreated = useCallback((value: DisciplineOption) => {
    setCreatedDisciplines((prev) => mergeCreated(prev, [value]));
    // Auto-close discipline drawer and open class drawer after creating first discipline
    setDisciplineOpen(false);
    setClassOpen(true);
  }, []);

  const onClassCreated = useCallback((value: ClassTemplateOption) => {
    setCreatedClasses((prev) => mergeCreated(prev, [value]));
  }, []);

  const openDisciplineDrawer = useCallback(() => {
    setDisciplineOpen(true);
    setClassOpen(false);
  }, []);

  // Stats derived
  const byDiscipline = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of allClasses) {
      map.set(c.disciplineName, (map.get(c.disciplineName) ?? 0) + 1);
    }
    return map;
  }, [allClasses]);

  return (
    <div className="space-y-4">
      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          {
            label: "Disciplinas",
            value: allDisciplines.length,
            icon: Tags,
            accent: "text-primary",
          },
          {
            label: "Clases",
            value: allClasses.length,
            icon: Dumbbell,
            accent: "text-info",
          },
          {
            label: "Con horarios",
            value: allClasses.filter((c) => c.scheduleCount > 0).length,
            icon: Check,
            accent: "text-success",
          },
          {
            label: "Sin horarios",
            value: allClasses.filter((c) => c.scheduleCount === 0).length,
            icon: Archive,
            accent: "text-warning",
          },
        ].map(({ label, value, icon: Icon, accent }) => (
          <Surface key={label} className="flex items-center gap-3 p-3 sm:p-4">
            <Icon aria-hidden="true" className={`h-5 w-5 shrink-0 ${accent}`} />
            <div className="min-w-0">
              <p className="truncate text-xs text-muted-foreground">{label}</p>
              <p className="metric-number text-xl font-bold tabular-nums">
                {value}
              </p>
            </div>
          </Surface>
        ))}
      </div>

      {/* Creation drawers */}
      <div className="space-y-2">
        <DisciplineInlineForm
          open={disciplineOpen}
          onToggle={() => setDisciplineOpen((v) => !v)}
          onCreated={onDisciplineCreated}
          existingNames={allDisciplineNames}
        />
        <ClassCreationForm
          disciplines={allDisciplines}
          existingClassNames={allClassNames}
          open={classOpen}
          onToggle={() => setClassOpen((v) => !v)}
          onCreated={onClassCreated}
          onNeedDiscipline={openDisciplineDrawer}
        />
      </div>

      {/* Catalog */}
      <ClassCatalog
        classes={allClasses}
        onAddClass={() => setClassOpen(true)}
      />
    </div>
  );
}
