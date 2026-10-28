"use client";

import {
  memo,
  useActionState,
  useCallback,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";
import Link from "next/link";
import { Dialog } from "@base-ui/react/dialog";
import {
  Archive,
  Check,
  Dumbbell,
  LayoutGrid,
  Pencil,
  Plus,
  Search,
  Table2,
  Tags,
  Trash2,
  X,
} from "lucide-react";
import type {
  DisciplineAdministrationRow,
  DisciplineList,
} from "@/application/instructor-operations/ports/discipline-administration-port";
import {
  Button,
  EmptyState,
  FieldControl,
  Surface,
} from "@/presentation/components/primitives";
import { CatalogCard } from "@/presentation/components/catalog-card";
import { saveDisciplineAction, type DisciplineActionState } from "./actions";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const fieldClass =
  "h-10 w-full rounded-lg border border-input bg-background/50 px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-45";

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

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ViewMode = "cards" | "table";
type EditorMode =
  | { operation: "create" }
  | { operation: "update" | "delete"; discipline: DisciplineAdministrationRow };

function normalise(s: string) {
  return s.trim().toLocaleLowerCase("es");
}

// ---------------------------------------------------------------------------
// DisciplineEditor — modal dialog for create / edit / delete
// ---------------------------------------------------------------------------

function DisciplineEditor({
  editor,
  onClose,
  onSaved,
  finalFocus,
  existingNames,
}: {
  editor: EditorMode;
  onClose: () => void;
  onSaved: (message: string) => void;
  finalFocus: RefObject<HTMLButtonElement | null>;
  existingNames: string[];
}) {
  const discipline = editor.operation === "create" ? null : editor.discipline;
  const deleting = editor.operation === "delete";

  const [name, setName] = useState(discipline?.name ?? "");
  const [status, setStatus] = useState<string>(discipline?.status ?? "active");
  const [selectedPreset, setSelectedPreset] = useState(discipline?.name ?? "");

  const isDuplicate =
    !deleting &&
    normalise(name) !== normalise(discipline?.name ?? "") &&
    existingNames.some((n) => normalise(n) === normalise(name));

  const [state, action, pending] = useActionState(
    async (previous: DisciplineActionState, data: FormData) => {
      const result = await saveDisciplineAction(previous, data);
      if (result.message) onSaved(result.message);
      return result;
    },
    { error: null, message: null },
  );

  const cancelRef = useRef<HTMLButtonElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  const handlePresetClick = useCallback(
    (preset: string) => {
      const alreadyExists = existingNames.some(
        (n) => normalise(n) === normalise(preset),
      );
      if (alreadyExists) return;
      const next =
        normalise(selectedPreset) === normalise(preset) ? "" : preset;
      setSelectedPreset(next);
      setName(next);
    },
    [selectedPreset, existingNames],
  );

  return (
    <Dialog.Root
      open
      onOpenChange={(open) => {
        if (!open && !pending) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-60 bg-black/65 backdrop-blur-sm" />
        <Dialog.Popup
          initialFocus={deleting ? cancelRef : nameRef}
          finalFocus={finalFocus}
          className="fixed left-1/2 top-1/2 z-70 max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-border bg-card p-5 text-foreground shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <span
              className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${deleting ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"}`}
            >
              {deleting ? (
                <Trash2 aria-hidden="true" className="h-5 w-5" />
              ) : (
                <Tags aria-hidden="true" className="h-5 w-5" />
              )}
            </span>
            <Button
              variant="quiet"
              aria-label="Cerrar formulario"
              disabled={pending}
              onClick={onClose}
            >
              <X aria-hidden="true" className="h-4 w-4" />
            </Button>
          </div>

          <Dialog.Title className="mt-3 text-lg font-bold tracking-tight">
            {deleting
              ? "Eliminar disciplina"
              : discipline
                ? "Editar disciplina"
                : "Nueva disciplina"}
          </Dialog.Title>
          <Dialog.Description className="mt-1.5 text-sm leading-6 text-muted-foreground">
            {deleting
              ? `Vas a eliminar "${discipline?.name}". Esta acción es definitiva y solo está disponible para disciplinas sin clases asociadas.`
              : discipline
                ? "Actualiza el nombre o estado de la disciplina."
                : "Elige un preset o escribe el nombre de la nueva disciplina."}
          </Dialog.Description>

          <form action={action} className="mt-5 space-y-4">
            <input type="hidden" name="operation" value={editor.operation} />
            {discipline ? (
              <input type="hidden" name="id" value={discipline.id} />
            ) : null}

            {!deleting ? (
              <>
                {/* Preset chips — only shown on create */}
                {!discipline ? (
                  <div
                    role="group"
                    aria-label="Disciplinas sugeridas"
                    className="flex flex-wrap gap-1.5"
                  >
                    {DISCIPLINE_PRESETS.map((preset) => {
                      const isSelected =
                        normalise(selectedPreset) === normalise(preset);
                      const alreadyExists = existingNames.some(
                        (n) => normalise(n) === normalise(preset),
                      );
                      return (
                        <button
                          key={preset}
                          type="button"
                          disabled={pending || alreadyExists}
                          aria-pressed={isSelected}
                          title={
                            alreadyExists
                              ? "Ya existe esta disciplina"
                              : undefined
                          }
                          onClick={() => handlePresetClick(preset)}
                          className={[
                            "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                            "disabled:cursor-not-allowed disabled:opacity-50",
                            isSelected
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
                ) : null}

                {/* Name field */}
                <label className="block space-y-1.5 text-sm font-semibold">
                  <span>
                    {discipline
                      ? "Nombre de la disciplina"
                      : "O escribe una nueva"}
                  </span>
                  <div className="relative">
                    <FieldControl
                      ref={nameRef}
                      name="name"
                      required
                      maxLength={100}
                      value={name}
                      onChange={(e) => {
                        setName(e.target.value);
                        setSelectedPreset(e.target.value);
                      }}
                      placeholder="Ej. Pilates, CrossFit…"
                      disabled={pending}
                      autoComplete="off"
                    />
                    {isDuplicate && name.trim() ? (
                      <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-warning">
                        Ya existe
                      </span>
                    ) : null}
                  </div>
                </label>

                {/* Status — only on edit */}
                {discipline ? (
                  <label className="block space-y-1.5 text-sm font-semibold">
                    <span>Estado</span>
                    <select
                      name="status"
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      disabled={pending}
                      className={fieldClass}
                    >
                      <option value="active">Activa</option>
                      <option value="archived">Archivada</option>
                    </select>
                    <span className="block text-xs font-normal leading-5 text-muted-foreground">
                      Archivar conserva las clases existentes. Reactiva cuando
                      quieras volver a utilizarla.
                    </span>
                  </label>
                ) : null}
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
              <Button ref={cancelRef} onClick={onClose} disabled={pending}>
                Cancelar
              </Button>
              <Button
                type="submit"
                variant={deleting ? "danger" : "primary"}
                isLoading={pending}
                disabled={!deleting && (!name.trim() || isDuplicate)}
              >
                {pending
                  ? "Guardando…"
                  : deleting
                    ? "Eliminar definitivamente"
                    : discipline
                      ? "Guardar cambios"
                      : "Crear disciplina"}
              </Button>
            </div>
          </form>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// ---------------------------------------------------------------------------
// DisciplineTableRow — single row for table view
// ---------------------------------------------------------------------------

const DisciplineTableRow = memo(function DisciplineTableRow({
  discipline,
  canManage,
  onEdit,
  onDelete,
}: {
  discipline: DisciplineAdministrationRow;
  canManage: boolean;
  onEdit: (d: DisciplineAdministrationRow, b: HTMLButtonElement) => void;
  onDelete: (d: DisciplineAdministrationRow, b: HTMLButtonElement) => void;
}) {
  const isActive = discipline.status === "active";
  return (
    <tr className="border-b border-white/6 last:border-b-0 hover:bg-surface-raised/40">
      <td className="py-3 pl-4 pr-3 align-middle font-semibold text-foreground">
        {discipline.name}
      </td>
      <td className="px-3 py-3 align-middle">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${isActive ? "border-success/30 bg-success/10 text-success" : "border-border bg-muted text-muted-foreground"}`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full bg-current`}
            aria-hidden="true"
          />
          {isActive ? "Activa" : "Archivada"}
        </span>
      </td>
      <td className="px-3 py-3 align-middle text-sm tabular-nums text-muted-foreground">
        {discipline.templateCount}{" "}
        {discipline.templateCount === 1 ? "clase" : "clases"}
      </td>
      <td className="px-3 py-3 align-middle text-sm text-muted-foreground">
        {new Intl.DateTimeFormat("es-CL", {
          dateStyle: "medium",
          timeZone: "UTC",
        }).format(new Date(discipline.createdAt))}
      </td>
      {canManage ? (
        <td className="py-3 pl-3 pr-4 align-middle">
          <div className="flex items-center justify-end gap-1.5">
            <Button
              aria-label={`Editar ${discipline.name}`}
              onClick={(e) => onEdit(discipline, e.currentTarget)}
              className="h-8 px-2.5 text-xs"
            >
              <Pencil aria-hidden="true" className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="danger"
              aria-label={`Eliminar ${discipline.name}`}
              disabled={discipline.templateCount > 0}
              title={
                discipline.templateCount > 0
                  ? "Tiene clases asociadas. Archívala desde Editar."
                  : "Eliminar disciplina"
              }
              onClick={(e) => onDelete(discipline, e.currentTarget)}
              className="h-8 px-2.5 text-xs"
            >
              <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
            </Button>
          </div>
        </td>
      ) : null}
    </tr>
  );
});

// ---------------------------------------------------------------------------
// DisciplinesWorkspace — root client component
// ---------------------------------------------------------------------------

export function DisciplinesWorkspace({
  disciplines,
  search,
  status,
  canManage,
}: {
  disciplines: DisciplineList;
  search: string;
  status: "active" | "archived" | "all";
  canManage: boolean;
}) {
  const [editor, setEditor] = useState<EditorMode | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("cards");
  const opener = useRef<HTMLButtonElement | null>(null);

  const totalPages = Math.max(
    1,
    Math.ceil(disciplines.total / disciplines.pageSize),
  );

  const existingNames = useMemo(
    () => disciplines.rows.map((d) => d.name),
    [disciplines.rows],
  );

  const open = useCallback((next: EditorMode, button: HTMLButtonElement) => {
    opener.current = button;
    setMessage(null);
    setEditor(next);
  }, []);

  const handleClose = useCallback(() => setEditor(null), []);
  const handleSaved = useCallback((text: string) => {
    setMessage(text);
    setEditor(null);
  }, []);

  const pageHref = (page: number) => {
    const params = new URLSearchParams({
      status,
      page: String(page),
      pageSize: String(disciplines.pageSize),
    });
    if (search) params.set("search", search);
    return `/dashboard/disciplines?${params}`;
  };

  const createButton = canManage ? (
    <Button
      variant="primary"
      className="h-9 shrink-0 text-sm"
      onClick={(e) => open({ operation: "create" }, e.currentTarget)}
    >
      <Plus aria-hidden="true" className="h-4 w-4" />
      <span className="hidden sm:inline">Nueva disciplina</span>
    </Button>
  ) : null;

  return (
    <>
      {/* ------------------------------------------------------------------ */}
      {/* Stats */}
      {/* ------------------------------------------------------------------ */}
      <div className="grid grid-cols-3 gap-3">
        {[
          {
            label: "Total",
            value: disciplines.activeCount + disciplines.archivedCount,
            icon: Tags,
            accent: "text-primary",
          },
          {
            label: "Activas",
            value: disciplines.activeCount,
            icon: Check,
            accent: "text-success",
          },
          {
            label: "Archivadas",
            value: disciplines.archivedCount,
            icon: Archive,
            accent: "text-warning",
          },
        ].map(({ label, value, icon: Icon, accent }) => (
          <Surface key={label} className="flex items-center gap-2.5 p-3 sm:p-4">
            <Icon
              aria-hidden="true"
              className={`h-4 w-4 shrink-0 sm:h-5 sm:w-5 ${accent}`}
            />
            <div className="min-w-0">
              <p className="truncate text-xs text-muted-foreground">{label}</p>
              <p className="metric-number text-xl font-bold tabular-nums">
                {value}
              </p>
            </div>
          </Surface>
        ))}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Success message */}
      {/* ------------------------------------------------------------------ */}
      {message ? (
        <p
          role="status"
          className="flex items-center gap-2 rounded-xl border border-success/25 bg-success/10 px-4 py-3 text-sm text-success"
        >
          <Check aria-hidden="true" className="h-4 w-4 shrink-0" />
          {message}
        </p>
      ) : null}

      {/* Role hint */}
      {!canManage ? (
        <p className="text-sm text-muted-foreground">
          Tu perfil puede consultar el catálogo. Solicita a un administrador
          cualquier cambio.
        </p>
      ) : null}

      {/* ------------------------------------------------------------------ */}
      {/* Main panel */}
      {/* ------------------------------------------------------------------ */}
      <Surface className="overflow-hidden p-0">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3 border-b border-border bg-muted/40 px-4 py-3 sm:px-5">
          {/* Search form */}
          <form
            method="get"
            className="flex flex-1 flex-wrap items-center gap-2"
            style={{ minWidth: 0 }}
          >
            {/* Search input */}
            <label className="relative flex-1" style={{ minWidth: 160 }}>
              <span className="sr-only">Buscar disciplina</span>
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              />
              <FieldControl
                key={search}
                name="search"
                defaultValue={search}
                maxLength={200}
                placeholder="Buscar por nombre…"
                className="h-9 bg-background/70 pl-9 text-sm"
              />
            </label>

            {/* Status filter */}
            <label className="sr-only" htmlFor="discipline-status-filter">
              Estado
            </label>
            <select
              id="discipline-status-filter"
              key={status}
              name="status"
              defaultValue={status}
              className="h-9 rounded-lg border border-input bg-background/50 px-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="all">Todos</option>
              <option value="active">Activas</option>
              <option value="archived">Archivadas</option>
            </select>

            <input type="hidden" name="pageSize" value={disciplines.pageSize} />
            <Button type="submit" className="h-9 text-sm">
              <Search aria-hidden="true" className="h-3.5 w-3.5 sm:hidden" />
              <span className="hidden sm:inline">Filtrar</span>
            </Button>
          </form>

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

          {createButton}
        </div>

        {/* Meta */}
        <div className="px-4 py-2.5 sm:px-5">
          <p className="text-xs text-muted-foreground">
            {disciplines.total}{" "}
            {disciplines.total === 1 ? "disciplina" : "disciplinas"}
            {totalPages > 1
              ? ` · Página ${disciplines.page} / ${totalPages}`
              : ""}
          </p>
        </div>

        {/* List */}
        {disciplines.rows.length === 0 ? (
          <EmptyState
            title={
              search || status !== "all"
                ? "No encontramos disciplinas"
                : "Tu catálogo empieza aquí"
            }
            description={
              search || status !== "all"
                ? "Prueba otro nombre o cambia el filtro de estado."
                : "Crea tu primera disciplina y da estructura a las clases de tu gimnasio."
            }
            action={
              search || status !== "all" ? (
                <Link
                  href="/dashboard/disciplines"
                  className="text-sm font-semibold text-primary"
                >
                  Limpiar filtros
                </Link>
              ) : (
                createButton
              )
            }
          />
        ) : viewMode === "cards" ? (
          <ul
            aria-label="Disciplinas"
            className="grid gap-3 p-4 sm:grid-cols-2 sm:p-5 xl:grid-cols-3"
          >
            {disciplines.rows.map((discipline) => (
              <li key={discipline.id} className="min-w-0">
                <CatalogCard
                  toneKey={discipline.name}
                  muted={discipline.status !== "active"}
                  icon={Dumbbell}
                  badge={
                    discipline.status === "active" ? "Activa" : "Archivada"
                  }
                  title={discipline.name}
                  description={`${discipline.templateCount} ${discipline.templateCount === 1 ? "clase asociada" : "clases asociadas"}`}
                  meta={`Creada el ${new Intl.DateTimeFormat("es-CL", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(discipline.createdAt))}`}
                  actions={
                    canManage ? (
                      <>
                        <Button
                          aria-label={`Editar ${discipline.name}`}
                          className="flex-1 bg-background/60 backdrop-blur-sm"
                          onClick={(e) =>
                            open(
                              { operation: "update", discipline },
                              e.currentTarget,
                            )
                          }
                        >
                          <Pencil aria-hidden="true" className="h-4 w-4" />
                          Editar
                        </Button>
                        <Button
                          variant="danger"
                          className="flex-1"
                          disabled={discipline.templateCount > 0}
                          aria-label={`Eliminar ${discipline.name}`}
                          title={
                            discipline.templateCount > 0
                              ? "Tiene clases asociadas. Archívala desde Editar."
                              : "Eliminar disciplina"
                          }
                          onClick={(e) =>
                            open(
                              { operation: "delete", discipline },
                              e.currentTarget,
                            )
                          }
                        >
                          <Trash2 aria-hidden="true" className="h-4 w-4" />
                          Eliminar
                        </Button>
                      </>
                    ) : undefined
                  }
                />
              </li>
            ))}
          </ul>
        ) : (
          <div className="overflow-x-auto px-4 pb-4 sm:px-5">
            <table className="w-full border-collapse text-sm">
              <caption className="sr-only">Catálogo de disciplinas</caption>
              <thead>
                <tr className="border-b border-white/8">
                  <th
                    scope="col"
                    className="py-2.5 pl-4 pr-3 text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground"
                  >
                    Nombre
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground"
                  >
                    Estado
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground"
                  >
                    Clases
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground"
                  >
                    Creación
                  </th>
                  {canManage ? (
                    <th scope="col" className="py-2.5 pl-3 pr-4">
                      <span className="sr-only">Acciones</span>
                    </th>
                  ) : null}
                </tr>
              </thead>
              <tbody>
                {disciplines.rows.map((discipline) => (
                  <DisciplineTableRow
                    key={discipline.id}
                    discipline={discipline}
                    canManage={canManage}
                    onEdit={(d, b) =>
                      open({ operation: "update", discipline: d }, b)
                    }
                    onDelete={(d, b) =>
                      open({ operation: "delete", discipline: d }, b)
                    }
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer: legend + pagination */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3 text-xs text-muted-foreground sm:px-5">
          <p>Disciplinas con clases se archivan, no se eliminan.</p>
          {totalPages > 1 ? (
            <nav
              aria-label="Paginación de disciplinas"
              className="flex items-center gap-2"
            >
              {disciplines.page > 1 ? (
                <Link
                  className="rounded-lg border border-border px-3 py-2 font-semibold hover:bg-surface-raised"
                  href={pageHref(disciplines.page - 1)}
                >
                  ← Ant.
                </Link>
              ) : (
                <span aria-disabled="true" className="px-3 py-2 opacity-40">
                  ← Ant.
                </span>
              )}
              <span className="tabular-nums">
                {disciplines.page} / {totalPages}
              </span>
              {disciplines.page < totalPages ? (
                <Link
                  className="rounded-lg border border-border px-3 py-2 font-semibold hover:bg-surface-raised"
                  href={pageHref(disciplines.page + 1)}
                >
                  Sig. →
                </Link>
              ) : (
                <span aria-disabled="true" className="px-3 py-2 opacity-40">
                  Sig. →
                </span>
              )}
            </nav>
          ) : null}
        </div>
      </Surface>

      {/* ------------------------------------------------------------------ */}
      {/* Editor dialog */}
      {/* ------------------------------------------------------------------ */}
      {editor ? (
        <DisciplineEditor
          editor={editor}
          finalFocus={opener}
          existingNames={existingNames}
          onClose={handleClose}
          onSaved={handleSaved}
        />
      ) : null}
    </>
  );
}
