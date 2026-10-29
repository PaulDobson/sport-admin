"use client";

import { useActionState, useCallback, useRef, useState } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { MapPin, Pencil, Plus, Trash2, X } from "lucide-react";
import type { DayLocation } from "@/domain/instructor-operations/instructor-day";
import { Button, Surface } from "@/presentation/components/primitives";
import {
  LocationCreationForm,
  programmingFieldClass,
} from "@/app/dashboard/schedule/programming-catalog-forms";
import {
  saveLocationAction,
  type ProgrammingActionState,
} from "@/app/dashboard/schedule/programming-actions";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mergeCreated<T extends { id: string }>(catalog: T[], created: T[]) {
  if (created.length === 0) return catalog;
  const existingIds = new Set(catalog.map((item) => item.id));
  const novel = created.filter((item) => !existingIds.has(item.id));
  return novel.length === 0 ? catalog : [...catalog, ...novel];
}

// ---------------------------------------------------------------------------
// Location editor dialog
// ---------------------------------------------------------------------------

type LocationEditorState =
  | { operation: "update"; location: DayLocation }
  | { operation: "archive"; location: DayLocation };

function LocationEditorDialog({
  editor,
  onClose,
  onSaved,
}: {
  editor: LocationEditorState;
  onClose: () => void;
  onSaved: (id: string, updated?: Partial<DayLocation>) => void;
}) {
  const { location } = editor;
  const archiving = editor.operation === "archive";
  const [name, setName] = useState(location.name);
  const [address, setAddress] = useState(location.address ?? "");
  const cancelRef = useRef<HTMLButtonElement>(null);

  const [state, action, pending] = useActionState(
    async (previous: ProgrammingActionState, data: FormData) => {
      const result = await saveLocationAction(previous, data);
      if (!result.error) {
        onSaved(
          location.id,
          archiving
            ? undefined
            : { name: name.trim(), address: address.trim() || null },
        );
      }
      return result;
    },
    { error: null, message: null },
  );

  return (
    <Dialog.Root open onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" />
        <Dialog.Popup className="fixed inset-x-4 top-1/2 z-50 mx-auto max-w-md -translate-y-1/2 rounded-2xl border border-border bg-card p-6 shadow-2xl focus:outline-none">
          <div className="mb-4 flex items-start justify-between gap-3">
            <Dialog.Title className="text-base font-bold">
              {archiving ? "Archivar ubicación" : "Editar ubicación"}
            </Dialog.Title>
            <button
              ref={cancelRef}
              onClick={onClose}
              aria-label="Cerrar"
              className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted-foreground hover:bg-surface-raised"
            >
              <X aria-hidden="true" className="h-4 w-4" />
            </button>
          </div>

          <form action={action} className="space-y-4">
            <input type="hidden" name="locationId" value={location.id} />
            <input
              type="hidden"
              name="operation"
              value={archiving ? "archive" : "update"}
            />

            {archiving ? (
              <p className="rounded-lg border border-destructive/25 bg-destructive/10 p-3 text-sm text-destructive">
                Al archivar esta ubicación, los horarios existentes no se
                modifican pero ya no podrás asignarla a nuevas clases.
              </p>
            ) : (
              <>
                <label className="flex flex-col gap-1.5 text-sm font-semibold">
                  Nombre
                  <input
                    name="name"
                    required
                    maxLength={100}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={pending}
                    className={programmingFieldClass}
                  />
                </label>
                <label className="flex flex-col gap-1.5 text-sm font-semibold">
                  Dirección (opcional)
                  <input
                    name="address"
                    maxLength={180}
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    disabled={pending}
                    className={programmingFieldClass}
                  />
                </label>
              </>
            )}

            {state.error ? (
              <p
                role="alert"
                className="rounded-lg border border-destructive/25 bg-destructive/10 p-3 text-sm text-destructive"
              >
                {state.error}
              </p>
            ) : null}

            <div className="flex flex-wrap justify-end gap-3 border-t border-border pt-4">
              <Button ref={cancelRef} onClick={onClose} disabled={pending}>
                Cancelar
              </Button>
              <Button
                type="submit"
                variant={archiving ? "danger" : "primary"}
                isLoading={pending}
              >
                {pending
                  ? "Guardando…"
                  : archiving
                    ? "Archivar"
                    : "Guardar cambios"}
              </Button>
            </div>
          </form>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// ---------------------------------------------------------------------------
// Main workspace
// ---------------------------------------------------------------------------

export function LocationsWorkspace({ locations }: { locations: DayLocation[] }) {
  const [createdLocations, setCreatedLocations] = useState<DayLocation[]>([]);
  const [archivedLocationIds, setArchivedLocationIds] = useState<Set<string>>(
    new Set(),
  );
  const [locationEditor, setLocationEditor] =
    useState<LocationEditorState | null>(null);

  const allLocations = mergeCreated(locations, createdLocations).filter(
    (loc) => !archivedLocationIds.has(loc.id),
  );

  const onLocationCreated = useCallback(
    (value: DayLocation) =>
      setCreatedLocations((c) => mergeCreated(c, [value])),
    [],
  );
  const onLocationSaved = useCallback(
    (id: string, updated?: Partial<DayLocation>) => {
      if (!updated) {
        setArchivedLocationIds((c) => new Set([...c, id]));
      } else {
        setCreatedLocations((c) =>
          c.map((loc) => (loc.id === id ? { ...loc, ...updated } : loc)),
        );
      }
      setLocationEditor(null);
    },
    [],
  );

  return (
    <div className="space-y-4">
      <Surface className="space-y-4 border-border/80 bg-surface-raised p-4 sm:p-5">
        <div>
          <h2 className="text-base font-bold">Ubicaciones</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Reutiliza un lugar en todas las clases que imparta.
          </p>
        </div>

        {allLocations.length > 0 ? (
          <ul className="grid gap-2 sm:grid-cols-2">
            {allLocations.map((location) => (
              <li
                key={location.id}
                className="flex min-w-0 items-start gap-2 rounded-xl border border-border/60 bg-muted p-3 text-sm"
              >
                <MapPin
                  aria-hidden="true"
                  className="mt-0.5 h-4 w-4 shrink-0 text-primary"
                />
                <div className="min-w-0 grow wrap-anywhere">
                  <p className="font-semibold">{location.name}</p>
                  {location.address ? (
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {location.address}
                    </p>
                  ) : null}
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button
                    variant="quiet"
                    aria-label={`Editar ${location.name}`}
                    onClick={() =>
                      setLocationEditor({ operation: "update", location })
                    }
                  >
                    <Pencil aria-hidden="true" className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="quiet"
                    aria-label={`Archivar ${location.name}`}
                    onClick={() =>
                      setLocationEditor({ operation: "archive", location })
                    }
                  >
                    <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">
            Aún no tienes ubicaciones registradas.
          </p>
        )}

        <div className="border-t border-border pt-4">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-bold">
            <Plus aria-hidden="true" className="h-4 w-4 text-muted-foreground" />
            Añadir ubicación
          </h3>
          <LocationCreationForm onCreated={onLocationCreated} />
        </div>
      </Surface>

      {locationEditor ? (
        <LocationEditorDialog
          editor={locationEditor}
          onClose={() => setLocationEditor(null)}
          onSaved={onLocationSaved}
        />
      ) : null}
    </div>
  );
}
