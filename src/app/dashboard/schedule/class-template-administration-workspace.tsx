"use client";

import { useActionState, useEffect, useRef, useState, type RefObject } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { Dumbbell, Pencil, Search, Trash2, X } from "lucide-react";
import type { ClassTemplateAdministrationRow } from "@/application/instructor-operations/ports/class-template-administration-port";
import { Button, FieldControl, Surface } from "@/presentation/components/primitives";
import { CatalogCard } from "@/presentation/components/catalog-card";
import { saveClassTemplateAction, type ProgrammingActionState } from "./programming-actions";

type Editor = { operation: "update" | "delete"; template: ClassTemplateAdministrationRow };
const pageSize = 6;

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
  const dirty = !deleting && (name !== template.name || capacity !== String(template.capacity));
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
  const requestClose = () => {
    if (pending) return;
    if (dirty) setDiscarding(true);
    else onClose();
  };
  useEffect(() => {
    if (discarding) continueRef.current?.focus();
    else nameRef.current?.focus();
  }, [discarding]);
  useEffect(() => {
    if (!dirty) return;
    const preventLeaving = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", preventLeaving);
    return () => window.removeEventListener("beforeunload", preventLeaving);
  }, [dirty]);

  return (
    <Dialog.Root open onOpenChange={(open) => { if (!open) requestClose(); }}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-[60] bg-black/65 backdrop-blur-sm" />
        <Dialog.Popup
          initialFocus={deleting ? cancelRef : nameRef}
          finalFocus={() => opener.current?.isConnected ? opener.current : fallbackFocus.current}
          className="fixed left-1/2 top-1/2 z-[70] max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-border bg-card p-5 text-foreground shadow-2xl sm:p-7"
        >
          <div className="flex items-start justify-between gap-4">
            <span className={`grid h-12 w-12 place-items-center rounded-xl ${deleting ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"}`}>
              {deleting ? <Trash2 aria-hidden="true" /> : <Dumbbell aria-hidden="true" />}
            </span>
            <Button variant="quiet" aria-label="Cerrar formulario de clase" disabled={pending} onClick={requestClose}>
              <X aria-hidden="true" className="h-4 w-4" />
            </Button>
          </div>
          <Dialog.Title className="mt-4 text-xl font-bold">
            {discarding ? "¿Descartar los cambios?" : deleting ? "Eliminar clase" : "Editar clase"}
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
              <Button ref={continueRef} onClick={() => setDiscarding(false)}>Seguir editando</Button>
              <Button variant="danger" onClick={onClose}>Descartar cambios</Button>
            </div>
          ) : (
            <form action={action} className="mt-6 space-y-5">
              <input type="hidden" name="operation" value={operation} />
              <input type="hidden" name="id" value={template.id} />
              {!deleting ? (
                <>
                  <label className="block space-y-2 text-sm font-semibold">
                    <span>Nombre de la clase</span>
                    <FieldControl ref={nameRef} name="className" required maxLength={100} value={name} onChange={(event) => setName(event.target.value)} disabled={pending} autoComplete="off" />
                  </label>
                  <label className="block space-y-2 text-sm font-semibold">
                    <span>Capacidad</span>
                    <FieldControl name="capacity" type="number" min="1" max="500" step="1" required value={capacity} onChange={(event) => setCapacity(event.target.value)} disabled={pending} aria-describedby="class-edit-impact" />
                  </label>
                  <p id="class-edit-impact" className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm leading-6 text-muted-foreground">
                    El nombre se actualizará donde se muestra esta clase, también en su historial.
                    La capacidad se aplicará solo a las sesiones que publiques después.
                    Las sesiones ya publicadas conservan sus cupos, reservas, fechas e instructores.
                  </p>
                </>
              ) : null}
              {state.error ? <p role="alert" className="rounded-lg border border-destructive/25 bg-destructive/10 p-3 text-sm text-destructive">{state.error}</p> : null}
              <div className="flex flex-wrap justify-end gap-3 border-t border-border pt-5">
                <Button ref={cancelRef} onClick={requestClose} disabled={pending}>Cancelar</Button>
                <Button type="submit" variant={deleting ? "danger" : "primary"} isLoading={pending} disabled={!deleting && !dirty}>
                  {pending ? deleting ? "Eliminando…" : "Guardando…" : deleting ? "Eliminar definitivamente" : "Guardar cambios"}
                </Button>
              </div>
            </form>
          )}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function ClassTemplateAdministrationWorkspace({ classes }: { classes: ClassTemplateAdministrationRow[] }) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const opener = useRef<HTMLButtonElement | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const query = search.trim().toLocaleLowerCase("es");
  const filtered = classes.filter((template) =>
    `${template.name} ${template.disciplineName}`.toLocaleLowerCase("es").includes(query),
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const rows = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const open = (operation: Editor["operation"], template: ClassTemplateAdministrationRow, button: HTMLButtonElement) => {
    opener.current = button;
    setMessage(null);
    setEditor({ operation, template });
  };

  return (
    <Surface id="class-catalog" aria-labelledby="class-catalog-heading" className="p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 id="class-catalog-heading" className="text-lg font-semibold">Tus clases</h2>
          <p className="mt-1 text-sm text-muted-foreground">Edita tu oferta y revisa qué clases están en uso antes de eliminarlas.</p>
        </div>
        <label className="block w-full space-y-2 text-sm font-semibold sm:max-w-xs">
          <span>Buscar clase</span>
          <span className="relative block">
            <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
            <FieldControl ref={searchRef} type="search" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Nombre o disciplina" className="pl-9" />
          </span>
        </label>
      </div>
      {message ? <p role="status" className="mt-4 rounded-lg border border-success/20 bg-success/10 p-3 text-sm text-success">{message}</p> : null}
      <p aria-live="polite" className="mt-4 text-xs text-muted-foreground">{filtered.length} clases · Página {currentPage} de {totalPages}</p>
      {rows.length > 0 ? (
        <ul aria-label="Clases creadas" className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((template) => {
            const inUse = template.scheduleCount > 0 || template.sessionCount > 0;
            const usageId = `class-usage-${template.id}`;
            return (
              <li key={template.id} className="min-w-0">
                <CatalogCard
                  toneKey={template.disciplineName}
                  icon={Dumbbell}
                  badge={`${template.scheduleCount} ${template.scheduleCount === 1 ? "horario" : "horarios"}`}
                  title={template.name}
                  description={`${template.disciplineName} · ${template.capacity} cupos`}
                  meta={<p id={usageId}>
                    {inUse
                      ? `${template.scheduleCount} horarios · ${template.sessionCount} sesiones asociados, incluidos históricos. No se puede eliminar para proteger la programación.`
                      : "Sin horarios ni sesiones asociados. Puedes eliminar esta clase."}
                  </p>}
                  actions={<>
                    <Button aria-label={`Editar ${template.name}`} onClick={(event) => open("update", template, event.currentTarget)} className="min-h-10 flex-1 bg-background/60 backdrop-blur-sm">
                      <Pencil aria-hidden="true" className="h-4 w-4" /> Editar
                    </Button>
                    <Button variant="danger" aria-label={`Eliminar ${template.name}`} aria-describedby={usageId} disabled={inUse} onClick={(event) => open("delete", template, event.currentTarget)} className="min-h-10 flex-1">
                      <Trash2 aria-hidden="true" className="h-4 w-4" /> Eliminar
                    </Button>
                  </>}
                />
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="mt-4 rounded-xl border border-dashed border-border p-6 text-center">
          <h3 className="font-semibold">{classes.length === 0 ? "Todavía no has creado clases" : "No encontramos clases"}</h3>
          <p className="mt-2 text-sm text-muted-foreground">{classes.length === 0 ? "Crea tu primera clase para definir la disciplina y los cupos de tus entrenamientos." : "Prueba con otro nombre o busca por disciplina."}</p>
          {classes.length > 0 ? <Button className="mt-3" onClick={() => { setSearch(""); setPage(1); searchRef.current?.focus(); }}>Limpiar búsqueda</Button> : null}
        </div>
      )}
      {totalPages > 1 ? (
        <nav aria-label="Paginación de clases" className="mt-4 flex items-center justify-between gap-3">
          <Button disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>Anterior</Button>
          <span className="text-sm text-muted-foreground">{currentPage} / {totalPages}</span>
          <Button disabled={currentPage === totalPages} onClick={() => setPage(currentPage + 1)}>Siguiente</Button>
        </nav>
      ) : null}
      {editor ? (
        <ClassEditor
          editor={editor}
          opener={opener}
          fallbackFocus={searchRef}
          onClose={() => setEditor(null)}
          onSaved={(savedMessage) => { setEditor(null); setMessage(savedMessage); }}
        />
      ) : null}
    </Surface>
  );
}
