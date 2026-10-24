"use client";

import { useActionState, useRef, useState, type RefObject } from "react";
import Link from "next/link";
import { Dialog } from "@base-ui/react/dialog";
import {
  Archive,
  Check,
  Dumbbell,
  Pencil,
  Plus,
  Search,
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

const fieldClass =
  "h-11 w-full rounded-lg border border-input bg-background/50 px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30";
type Editor =
  | { operation: "create" }
  | { operation: "update" | "delete"; discipline: DisciplineAdministrationRow };

function DisciplineEditor({
  editor,
  onClose,
  onSaved,
  finalFocus,
}: {
  editor: Editor;
  onClose: () => void;
  onSaved: (message: string) => void;
  finalFocus: RefObject<HTMLButtonElement | null>;
}) {
  const discipline = editor.operation === "create" ? null : editor.discipline;
  const deleting = editor.operation === "delete";
  const [name, setName] = useState(discipline?.name ?? "");
  const [status, setStatus] = useState<string>(discipline?.status ?? "active");
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
          className="fixed left-1/2 top-1/2 z-70 max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-border bg-card p-5 text-foreground shadow-2xl sm:p-7"
        >
          <div className="flex items-start justify-between gap-4">
            <span
              className={`grid h-12 w-12 place-items-center rounded-xl ${deleting ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"}`}
            >
              {deleting ? (
                <Trash2 aria-hidden="true" />
              ) : (
                <Dumbbell aria-hidden="true" />
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
          <Dialog.Title className="mt-4 text-xl font-bold tracking-tight">
            {deleting
              ? "Eliminar disciplina"
              : discipline
                ? "Editar disciplina"
                : "Nueva disciplina"}
          </Dialog.Title>
          <Dialog.Description className="mt-2 text-sm leading-6 text-muted-foreground">
            {deleting
              ? `Vas a eliminar "${discipline?.name}". Esta acción es definitiva y solo está disponible para disciplinas sin clases asociadas.`
              : "Organiza tu oferta deportiva. El nombre identifica la disciplina en las plantillas de clase de tu academia."}
          </Dialog.Description>
          <form action={action} className="mt-6 space-y-5">
            <input type="hidden" name="operation" value={editor.operation} />
            {discipline ? (
              <input type="hidden" name="id" value={discipline.id} />
            ) : null}
            {!deleting ? (
              <>
                <label className="block space-y-2 text-sm font-semibold">
                  <span>Nombre de la disciplina</span>
                  <FieldControl
                    ref={nameRef}
                    name="name"
                    required
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Ej. Pilates, CrossFit o Yoga"
                    disabled={pending}
                    autoComplete="off"
                  />
                </label>
                {discipline ? (
                  <label className="block space-y-2 text-sm font-semibold">
                    <span>Estado</span>
                    <select
                      name="status"
                      value={status}
                      onChange={(event) => setStatus(event.target.value)}
                      disabled={pending}
                      className={fieldClass}
                    >
                      <option value="active">Activa</option>
                      <option value="archived">Archivada</option>
                    </select>
                    <span className="block text-xs font-normal leading-5 text-muted-foreground">
                      Archivar conserva las clases y sesiones existentes.
                      Reactiva la disciplina cuando quieras volver a utilizarla.
                    </span>
                  </label>
                ) : null}
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
              <Button ref={cancelRef} onClick={onClose} disabled={pending}>
                Cancelar
              </Button>
              <Button
                type="submit"
                variant={deleting ? "danger" : "primary"}
                isLoading={pending}
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
  const [editor, setEditor] = useState<Editor | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const opener = useRef<HTMLButtonElement | null>(null);
  const totalPages = Math.max(
    1,
    Math.ceil(disciplines.total / disciplines.pageSize),
  );
  const open = (next: Editor, button: HTMLButtonElement) => {
    opener.current = button;
    setMessage(null);
    setEditor(next);
  };
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
      onClick={(event) => open({ operation: "create" }, event.currentTarget)}
    >
      <Plus aria-hidden="true" className="h-4 w-4" /> Nueva disciplina
    </Button>
  ) : undefined;

  return (
    <>
      <Surface className="relative overflow-hidden border-primary/15 bg-linear-to-br from-primary/10 via-card to-card p-5 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="max-w-2xl">
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-primary">
              <Dumbbell aria-hidden="true" className="h-4 w-4" /> Catálogo
              deportivo
            </p>
            <h1 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
              Disciplinas que dan vida a tu gimnasio
            </h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Un catálogo claro, una programación más simple. Organiza,
              actualiza y cuida las disciplinas de tu academia.
            </p>
          </div>
          {createButton}
        </div>
      </Surface>
      <section
        aria-label="Resumen de disciplinas"
        className="grid grid-cols-3 gap-3"
      >
        {[
          {
            label: "Total",
            value: disciplines.activeCount + disciplines.archivedCount,
            icon: Dumbbell,
          },
          { label: "Activas", value: disciplines.activeCount, icon: Check },
          {
            label: "Archivadas",
            value: disciplines.archivedCount,
            icon: Archive,
          },
        ].map(({ label, value, icon: Icon }) => (
          <Surface
            key={label}
            className="flex flex-wrap items-center gap-3 sm:p-5"
          >
            <Icon aria-hidden="true" className="h-5 w-5 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground sm:text-sm">
                {label}
              </p>
              <p className="metric-number mt-1 text-2xl font-bold">{value}</p>
            </div>
          </Surface>
        ))}
      </section>
      {message ? (
        <p
          role="status"
          className="flex items-center gap-2 rounded-xl border border-success/25 bg-success/10 p-4 text-sm text-success"
        >
          <Check aria-hidden="true" className="h-4 w-4" />
          {message}
        </p>
      ) : null}
      {canManage ? (
        <Surface
          aria-labelledby="discipline-next-step-heading"
          className="border-primary/20 p-5"
        >
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">
            Disciplina → Clase → Sesión
          </p>
          <h2
            id="discipline-next-step-heading"
            className="mt-2 text-lg font-semibold"
          >
            {disciplines.activeCount > 0
              ? "Tu disciplina está lista. Continúa con una clase"
              : "Empieza por la actividad que enseñas"}
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {disciplines.activeCount > 0
              ? "En Programación, selecciona una disciplina activa y define el nombre y los cupos de tu clase. Después podrás asignarle una fecha y una ubicación."
              : "Crea una disciplina como Yoga, Pilates o Fútbol, o reactiva una archivada desde Editar. La disciplina estará disponible para seleccionarla al crear una clase."}
          </p>
          {disciplines.activeCount > 0 ? (
            <Link
              href="/dashboard/schedule/programming#class-template-setup"
              className="mt-3 inline-flex min-h-11 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
            >
              Continuar: crear una clase
            </Link>
          ) : null}
        </Surface>
      ) : null}
      {!canManage ? (
        <p className="text-sm text-muted-foreground">
          Tu perfil puede consultar el catálogo. Solicita a un administrador o
          instructor cualquier cambio.
        </p>
      ) : null}
      <Surface className="overflow-hidden p-0">
        <div className="space-y-4 border-b border-border p-4 sm:p-5">
          <div>
            <h2 className="text-lg font-semibold">Catálogo de disciplinas</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {disciplines.total} resultados · Página {disciplines.page} de{" "}
              {totalPages}
            </p>
          </div>
          <form
            method="get"
            className="grid items-end gap-3 sm:grid-cols-[minmax(0,1fr)_10rem_auto]"
          >
            <label className="space-y-2 text-sm font-semibold">
              <span>Buscar disciplina</span>
              <span className="relative block">
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
                  className="pl-9"
                />
              </span>
            </label>
            <label className="space-y-2 text-sm font-semibold">
              <span>Estado</span>
              <select
                key={status}
                name="status"
                defaultValue={status}
                className={fieldClass}
              >
                <option value="all">Todos los estados</option>
                <option value="active">Activas</option>
                <option value="archived">Archivadas</option>
              </select>
            </label>
            <input type="hidden" name="pageSize" value={disciplines.pageSize} />
            <Button type="submit">Aplicar filtros</Button>
          </form>
        </div>
        {disciplines.rows.length === 0 ? (
          <EmptyState
            title={
              search || status !== "all"
                ? "No encontramos disciplinas"
                : "Tu catálogo empieza aquí"
            }
            description={
              search || status !== "all"
                ? "Prueba otro nombre o cambia el estado para ampliar tu búsqueda."
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
        ) : (
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
                  description={`${discipline.templateCount} ${discipline.templateCount === 1 ? "clase asociada" : "clases asociadas"} · Creada el ${new Intl.DateTimeFormat("es-CL", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(discipline.createdAt))}`}
                  actions={
                    canManage ? (
                      <>
                        <Button
                          aria-label={`Editar ${discipline.name}`}
                          className="flex-1 bg-background/60 backdrop-blur-sm"
                          onClick={(event) =>
                            open(
                              { operation: "update", discipline },
                              event.currentTarget,
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
                              ? "Tiene clases asociadas. Puedes archivarla desde Editar."
                              : "Eliminar disciplina"
                          }
                          onClick={(event) =>
                            open(
                              { operation: "delete", discipline },
                              event.currentTarget,
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
        )}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border p-4 text-sm sm:px-5">
          <p className="text-muted-foreground">
            Las disciplinas con clases asociadas se archivan, no se eliminan.
          </p>
          <nav
            aria-label="Paginación de disciplinas"
            className="flex items-center gap-3"
          >
            {disciplines.page > 1 ? (
              <Link
                className="rounded-lg border border-border px-3 py-2 font-semibold hover:bg-surface-raised"
                href={pageHref(disciplines.page - 1)}
              >
                Anterior
              </Link>
            ) : (
              <span
                aria-disabled="true"
                className="px-3 py-2 text-muted-foreground/50"
              >
                Anterior
              </span>
            )}
            <span>
              {disciplines.page} / {totalPages}
            </span>
            {disciplines.page < totalPages ? (
              <Link
                className="rounded-lg border border-border px-3 py-2 font-semibold hover:bg-surface-raised"
                href={pageHref(disciplines.page + 1)}
              >
                Siguiente
              </Link>
            ) : (
              <span
                aria-disabled="true"
                className="px-3 py-2 text-muted-foreground/50"
              >
                Siguiente
              </span>
            )}
          </nav>
        </div>
      </Surface>
      {editor ? (
        <DisciplineEditor
          editor={editor}
          finalFocus={opener}
          onClose={() => setEditor(null)}
          onSaved={(text) => {
            setMessage(text);
            setEditor(null);
          }}
        />
      ) : null}
    </>
  );
}
