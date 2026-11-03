"use client";

import { useActionState, useCallback, useRef, useState } from "react";
import { Dialog } from "@base-ui/react/dialog";
import {
  Building2,
  Home,
  MapPin,
  Monitor,
  Pencil,
  Plus,
  Trash2,
  Trees,
  X,
} from "lucide-react";
import type { DayLocation } from "@/domain/instructor-operations/instructor-day";
import { Button, EmptyState } from "@/presentation/components/primitives";
import {
  programmingFieldClass,
  programmingLabelClass,
} from "@/app/dashboard/schedule/programming-catalog-forms";
import {
  createLocationAction,
  saveLocationAction,
  type ProgrammingActionState,
} from "@/app/dashboard/schedule/programming-actions";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type LocationType = "external_gym" | "park" | "home" | "online";

interface LocationWithType extends DayLocation {
  type?: LocationType;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mergeCreated<T extends { id: string }>(catalog: T[], created: T[]) {
  if (created.length === 0) return catalog;
  const existingIds = new Set(catalog.map((item) => item.id));
  const novel = created.filter((item) => !existingIds.has(item.id));
  return novel.length === 0 ? catalog : [...catalog, ...novel];
}

const typeConfig: Record<
  LocationType,
  { label: string; Icon: typeof MapPin; colorClass: string }
> = {
  external_gym: {
    label: "Gimnasio o salón",
    Icon: Building2,
    colorClass: "text-primary",
  },
  park: {
    label: "Parque",
    Icon: Trees,
    colorClass: "text-success",
  },
  home: {
    label: "Domicilio",
    Icon: Home,
    colorClass: "text-warning",
  },
  online: {
    label: "En línea",
    Icon: Monitor,
    colorClass: "text-info",
  },
};

function LocationTypeBadge({ type }: { type?: LocationType }) {
  const cfg = typeConfig[type ?? "external_gym"];
  const { Icon, label, colorClass } = cfg;
  return (
    <span className="inline-flex items-center gap-1.5">
      <Icon
        aria-hidden="true"
        className={`h-3.5 w-3.5 shrink-0 ${colorClass}`}
      />
      <span className="text-xs text-muted-foreground">{label}</span>
    </span>
  );
}

// ---------------------------------------------------------------------------
// Shared initial action state
// ---------------------------------------------------------------------------

const initialActionState: ProgrammingActionState = {
  error: null,
  message: null,
};

// ---------------------------------------------------------------------------
// Bottom-sheet dialog shell (shared by create/edit/archive)
// ---------------------------------------------------------------------------

function SheetDialog({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" />
        <Dialog.Popup className="fixed inset-x-3 bottom-0 z-50 mx-auto max-w-lg rounded-t-3xl border border-border bg-card px-4 pb-[calc(env(safe-area-inset-bottom,0px)+1.5rem)] pt-4 shadow-2xl focus:outline-none sm:bottom-auto sm:top-1/2 sm:inset-x-4 sm:rounded-2xl sm:px-6 sm:pb-6 sm:-translate-y-1/2">
          {/* drag handle – mobile only */}
          <div
            aria-hidden="true"
            className="mx-auto mb-4 h-1 w-10 rounded-full bg-border sm:hidden"
          />
          {children}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// ---------------------------------------------------------------------------
// Create / Edit form dialog
// ---------------------------------------------------------------------------

type EditorMode =
  | { mode: "create" }
  | { mode: "edit"; location: LocationWithType };

function LocationFormDialog({
  open,
  editorMode,
  onClose,
  onCreated,
  onSaved,
}: {
  open: boolean;
  editorMode: EditorMode;
  onClose: () => void;
  onCreated: (value: LocationWithType) => void;
  onSaved: (id: string, updated: Partial<LocationWithType>) => void;
}) {
  const isEdit = editorMode.mode === "edit";
  const existing = isEdit ? editorMode.location : null;

  // Local form state — reset on every open via key prop at usage site
  const [name, setName] = useState(existing?.name ?? "");
  const [address, setAddress] = useState(existing?.address ?? "");
  const [type, setType] = useState<LocationType>(
    existing?.type ?? "external_gym",
  );

  const [createState, createAction, createPending] = useActionState(
    async (previous: ProgrammingActionState, data: FormData) => {
      const result = await createLocationAction(previous, data);
      if (result.created) {
        onCreated({
          ...result.created,
          address: address.trim() || null,
          type,
        });
        onClose();
      }
      return result;
    },
    initialActionState,
  );

  const [editState, editAction, editPending] = useActionState(
    async (previous: ProgrammingActionState, data: FormData) => {
      const result = await saveLocationAction(previous, data);
      if (!result.error && existing) {
        onSaved(existing.id, {
          name: name.trim(),
          address: address.trim() || null,
          type,
        });
        onClose();
      }
      return result;
    },
    initialActionState,
  );

  const state = isEdit ? editState : createState;
  const formAction = isEdit ? editAction : createAction;
  const pending = isEdit ? editPending : createPending;

  return (
    <SheetDialog open={open} onClose={onClose}>
      <div className="mb-5 flex items-center justify-between gap-3">
        <Dialog.Title className="text-base font-bold">
          {isEdit ? "Editar ubicación" : "Nueva ubicación"}
        </Dialog.Title>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-surface-raised"
        >
          <X aria-hidden="true" className="h-4 w-4" />
        </button>
      </div>

      <form action={formAction} className="space-y-4">
        {isEdit && (
          <>
            <input type="hidden" name="id" value={existing!.id} />
            <input type="hidden" name="operation" value="update" />
          </>
        )}

        <label className={programmingLabelClass}>
          Nombre del lugar
          <input
            name="name"
            required
            maxLength={100}
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={pending}
            className={programmingFieldClass}
            placeholder="Parque Norte"
            autoFocus
          />
        </label>

        <label className={programmingLabelClass}>
          Tipo
          <select
            name="type"
            value={type}
            onChange={(e) => setType(e.target.value as LocationType)}
            disabled={pending}
            className={programmingFieldClass}
          >
            <option value="external_gym">Gimnasio o salón</option>
            <option value="park">Parque</option>
            <option value="home">Domicilio</option>
            <option value="online">En línea</option>
          </select>
        </label>

        <label className={programmingLabelClass}>
          Dirección{" "}
          <span className="font-normal text-muted-foreground">(opcional)</span>
          <input
            name="address"
            maxLength={180}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            disabled={pending}
            className={programmingFieldClass}
            placeholder="Calle y número"
          />
        </label>

        {state.error ? (
          <p
            role="alert"
            className="rounded-lg border border-destructive/25 bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
          >
            {state.error}
          </p>
        ) : null}

        <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end sm:gap-3">
          <Button
            onClick={onClose}
            disabled={pending}
            className="w-full sm:w-auto"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={pending}
            className="w-full sm:w-auto"
          >
            {isEdit ? "Guardar cambios" : "Crear ubicación"}
          </Button>
        </div>
      </form>
    </SheetDialog>
  );
}

// ---------------------------------------------------------------------------
// Archive confirmation dialog
// ---------------------------------------------------------------------------

function ArchiveDialog({
  location,
  onClose,
  onArchived,
}: {
  location: LocationWithType;
  onClose: () => void;
  onArchived: (id: string) => void;
}) {
  const [state, action, pending] = useActionState(
    async (previous: ProgrammingActionState, data: FormData) => {
      const result = await saveLocationAction(previous, data);
      if (!result.error) {
        onArchived(location.id);
        onClose();
      }
      return result;
    },
    initialActionState,
  );

  return (
    <SheetDialog open onClose={onClose}>
      <div className="mb-5 flex items-start gap-3">
        <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-destructive/10">
          <Trash2 aria-hidden="true" className="h-4 w-4 text-destructive" />
        </span>
        <div className="min-w-0">
          <Dialog.Title className="text-base font-bold">
            Archivar ubicación
          </Dialog.Title>
          <p className="mt-1 text-sm text-muted-foreground">
            <strong className="font-semibold text-foreground">
              {location.name}
            </strong>{" "}
            dejará de estar disponible para nuevas clases. Los horarios ya
            programados no se modifican.
          </p>
        </div>
      </div>

      <form action={action} className="space-y-4">
        <input type="hidden" name="id" value={location.id} />
        <input type="hidden" name="operation" value="archive" />

        {state.error ? (
          <p
            role="alert"
            className="rounded-lg border border-destructive/25 bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
          >
            {state.error}
          </p>
        ) : null}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
          <Button
            onClick={onClose}
            disabled={pending}
            className="w-full sm:w-auto"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="danger"
            isLoading={pending}
            className="w-full sm:w-auto"
          >
            Archivar
          </Button>
        </div>
      </form>
    </SheetDialog>
  );
}

// ---------------------------------------------------------------------------
// Row action buttons (inline icon buttons with tooltip)
// ---------------------------------------------------------------------------

function RowActions({
  location,
  onEdit,
  onArchive,
}: {
  location: LocationWithType;
  onEdit: (loc: LocationWithType) => void;
  onArchive: (loc: LocationWithType) => void;
}) {
  return (
    <div className="flex items-center gap-0.5">
      <button
        type="button"
        aria-label={`Editar ${location.name}`}
        onClick={() => onEdit(location)}
        className="group relative inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-surface-raised hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary"
      >
        <Pencil aria-hidden="true" className="h-3.5 w-3.5" />
        <span
          role="tooltip"
          className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-1.5 hidden -translate-x-1/2 whitespace-nowrap rounded-md border border-border bg-surface-overlay px-2 py-1 text-xs text-foreground shadow-lg group-hover:block group-focus-within:block"
        >
          Editar
        </span>
      </button>
      <button
        type="button"
        aria-label={`Archivar ${location.name}`}
        onClick={() => onArchive(location)}
        className="group relative inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-destructive"
      >
        <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
        <span
          role="tooltip"
          className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-1.5 hidden -translate-x-1/2 whitespace-nowrap rounded-md border border-border bg-surface-overlay px-2 py-1 text-xs text-foreground shadow-lg group-hover:block group-focus-within:block"
        >
          Archivar
        </span>
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Mobile location card
// ---------------------------------------------------------------------------

function LocationCard({
  location,
  onEdit,
  onArchive,
}: {
  location: LocationWithType;
  onEdit: (loc: LocationWithType) => void;
  onArchive: (loc: LocationWithType) => void;
}) {
  const cfg = typeConfig[location.type ?? "external_gym"];
  const { Icon, colorClass } = cfg;
  return (
    <div className="flex min-w-0 items-center gap-3">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-muted">
        <Icon aria-hidden="true" className={`h-4 w-4 ${colorClass}`} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">
          {location.name}
        </p>
        {location.address ? (
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {location.address}
          </p>
        ) : (
          <LocationTypeBadge type={location.type} />
        )}
      </div>
      <RowActions location={location} onEdit={onEdit} onArchive={onArchive} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Desktop table
// ---------------------------------------------------------------------------

function LocationsTable({
  locations,
  onEdit,
  onArchive,
}: {
  locations: LocationWithType[];
  onEdit: (loc: LocationWithType) => void;
  onArchive: (loc: LocationWithType) => void;
}) {
  return (
    <table className="w-full border-collapse text-sm">
      <caption className="sr-only">Ubicaciones</caption>
      <thead>
        <tr className="border-b border-border">
          <th
            scope="col"
            className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground"
          >
            Nombre
          </th>
          <th
            scope="col"
            className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground"
          >
            Tipo
          </th>
          <th
            scope="col"
            className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground"
          >
            Dirección
          </th>
          <th scope="col" className="px-4 py-3">
            <span className="sr-only">Acciones</span>
          </th>
        </tr>
      </thead>
      <tbody>
        {locations.map((loc) => {
          const cfg = typeConfig[loc.type ?? "external_gym"];
          const { Icon, colorClass } = cfg;
          return (
            <tr
              key={loc.id}
              className="border-b border-border/60 last:border-b-0 transition-colors hover:bg-surface-raised/40"
            >
              <td className="px-4 py-3.5 align-middle">
                <span className="flex items-center gap-2.5">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-muted">
                    <Icon
                      aria-hidden="true"
                      className={`h-3.5 w-3.5 ${colorClass}`}
                    />
                  </span>
                  <span className="font-medium text-foreground">
                    {loc.name}
                  </span>
                </span>
              </td>
              <td className="px-4 py-3.5 align-middle">
                <LocationTypeBadge type={loc.type} />
              </td>
              <td className="px-4 py-3.5 align-middle text-muted-foreground">
                {loc.address ?? (
                  <span className="text-muted-foreground/40">—</span>
                )}
              </td>
              <td className="px-4 py-3.5 align-middle text-right">
                <RowActions
                  location={loc}
                  onEdit={onEdit}
                  onArchive={onArchive}
                />
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

// ---------------------------------------------------------------------------
// Main workspace
// ---------------------------------------------------------------------------

export function LocationsWorkspace({
  locations,
}: {
  locations: DayLocation[];
}) {
  const [createdLocations, setCreatedLocations] = useState<LocationWithType[]>(
    [],
  );
  const [patchMap, setPatchMap] = useState<
    Map<string, Partial<LocationWithType>>
  >(new Map());
  const [archivedIds, setArchivedIds] = useState<Set<string>>(new Set());

  // Form/dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editorMode, setEditorMode] = useState<EditorMode>({ mode: "create" });
  const [archiveTarget, setArchiveTarget] = useState<LocationWithType | null>(
    null,
  );
  // Key tracks dialog instance to reset form state on re-open
  const [dialogKey, setDialogKey] = useState(0);

  const allLocations: LocationWithType[] = mergeCreated(
    locations as LocationWithType[],
    createdLocations,
  )
    .filter((loc) => !archivedIds.has(loc.id))
    .map((loc) => ({ ...loc, ...(patchMap.get(loc.id) ?? {}) }));

  const openCreate = useCallback(() => {
    setEditorMode({ mode: "create" });
    setDialogKey((k) => k + 1);
    setDialogOpen(true);
  }, []);

  const openEdit = useCallback((loc: LocationWithType) => {
    setEditorMode({ mode: "edit", location: loc });
    setDialogKey((k) => k + 1);
    setDialogOpen(true);
  }, []);

  const openArchive = useCallback((loc: LocationWithType) => {
    setArchiveTarget(loc);
  }, []);

  const onCreated = useCallback((value: LocationWithType) => {
    setCreatedLocations((prev) => mergeCreated(prev, [value]));
  }, []);

  const onSaved = useCallback(
    (id: string, updated: Partial<LocationWithType>) => {
      setPatchMap((prev) => {
        const next = new Map(prev);
        next.set(id, { ...(prev.get(id) ?? {}), ...updated });
        return next;
      });
    },
    [],
  );

  const onArchived = useCallback((id: string) => {
    setArchivedIds((prev) => new Set([...prev, id]));
  }, []);

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight">Ubicaciones</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Lugares donde impartes tus clases
          </p>
        </div>
        <Button variant="primary" onClick={openCreate} className="shrink-0">
          <Plus aria-hidden="true" className="h-4 w-4" />
          <span className="hidden sm:inline">Nueva ubicación</span>
          <span className="sm:hidden" aria-hidden="true">
            Nueva
          </span>
        </Button>
      </div>

      {/* Count badge */}
      {allLocations.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {allLocations.length}{" "}
          {allLocations.length === 1
            ? "ubicación registrada"
            : "ubicaciones registradas"}
        </p>
      )}

      {/* Table / card list container */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        {allLocations.length > 0 ? (
          <>
            {/* Mobile: card list */}
            <ul
              aria-label="Ubicaciones"
              className="divide-y divide-border lg:hidden"
            >
              {allLocations.map((loc) => (
                <li key={loc.id} className="px-4 py-3.5">
                  <LocationCard
                    location={loc}
                    onEdit={openEdit}
                    onArchive={openArchive}
                  />
                </li>
              ))}
            </ul>

            {/* Desktop: table */}
            <div className="hidden lg:block">
              <LocationsTable
                locations={allLocations}
                onEdit={openEdit}
                onArchive={openArchive}
              />
            </div>
          </>
        ) : (
          <EmptyState
            title="Sin ubicaciones"
            description="Añade el primer lugar donde impartirás tus clases."
            action={
              <Button variant="primary" onClick={openCreate}>
                <Plus aria-hidden="true" className="h-4 w-4" />
                Nueva ubicación
              </Button>
            }
          />
        )}
      </div>

      {/* Create / edit dialog — key forces fresh state on each open */}
      <LocationFormDialog
        key={dialogKey}
        open={dialogOpen}
        editorMode={editorMode}
        onClose={() => setDialogOpen(false)}
        onCreated={onCreated}
        onSaved={onSaved}
      />

      {/* Archive confirmation */}
      {archiveTarget ? (
        <ArchiveDialog
          location={archiveTarget}
          onClose={() => setArchiveTarget(null)}
          onArchived={onArchived}
        />
      ) : null}
    </div>
  );
}
