"use client";

import {
  useActionState,
  useId,
  useState,
  type ComponentProps,
  type ReactNode,
} from "react";
import { ChevronDown, type LucideIcon } from "lucide-react";
import type {
  DisciplineOption,
  ClassTemplateOption,
} from "@/application/instructor-operations/ports/schedule-catalog-port";
import type { DayLocation } from "@/domain/instructor-operations/instructor-day";
import { Button } from "@/presentation/components/primitives";
import {
  createClassTemplateAction,
  createDisciplineAction,
  createLocationAction,
  type ProgrammingActionState,
} from "./programming-actions";

export const programmingFieldClass =
  "mt-1.5 min-h-11 w-full min-w-0 rounded-lg border border-input bg-background px-3 py-2 text-base text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 sm:text-sm";
export const programmingLabelClass =
  "flex min-w-0 flex-col text-sm font-semibold";
const initialState: ProgrammingActionState = { error: null, message: null };

export function ProgrammingButton({
  className,
  ...props
}: ComponentProps<typeof Button>) {
  return <Button {...props} className={`min-h-11 ${className ?? ""}`} />;
}

export function CatalogCreationPanel({
  title,
  description,
  icon: Icon,
  open,
  onToggle,
  highlight = false,
  children,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
  open?: boolean;
  onToggle?: ComponentProps<"details">["onToggle"];
  /** Neon-highlight mode — draws attention when the user hasn't created this resource yet */
  highlight?: boolean;
  children: ReactNode;
}) {
  return (
    <details
      open={open}
      onToggle={onToggle}
      className={[
        "group overflow-hidden rounded-xl border transition-colors duration-300",
        highlight
          ? "animate-neon-pulse border-primary/60 bg-card"
          : "border-border bg-card open:border-primary/40",
      ].join(" ")}
    >
      <summary className="flex min-h-20 cursor-pointer list-none items-center justify-between gap-4 px-4 py-3 text-left focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary [&::-webkit-details-marker]:hidden">
        <span className="flex min-w-0 items-center gap-3">
          {/* Icon container — pulses with neon glow when highlighted */}
          <span
            className={[
              "grid h-10 w-10 shrink-0 place-items-center rounded-lg transition-colors",
              highlight
                ? "bg-primary/20 text-primary ring-2 ring-primary/50 ring-offset-2 ring-offset-card animate-neon-icon"
                : "bg-primary/10 text-primary",
            ].join(" ")}
          >
            <Icon aria-hidden="true" className="h-5 w-5" />
          </span>

          <span className="min-w-0">
            <span className="flex flex-wrap items-center gap-2">
              <span
                className={[
                  "block text-sm font-semibold",
                  highlight ? "text-primary" : "text-foreground",
                ].join(" ")}
              >
                {title}
              </span>
              {highlight ? (
                <span className="animate-neon-badge inline-flex items-center gap-1 rounded-full bg-primary/20 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-primary ring-1 ring-primary/40">
                  <span
                    aria-hidden="true"
                    className="inline-block h-1.5 w-1.5 rounded-full bg-primary"
                    style={{
                      animation: "neon-badge-pulse 1s ease-in-out infinite",
                    }}
                  />
                  Requerido
                </span>
              ) : null}
            </span>
            <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
              {description}
            </span>
          </span>
        </span>

        {/* Chevron or animated arrow when highlighted */}
        {highlight ? (
          <span
            aria-hidden="true"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary ring-1 ring-primary/30"
            style={{ animation: "neon-badge-pulse 1.4s ease-in-out infinite" }}
          >
            <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
          </span>
        ) : (
          <ChevronDown
            aria-hidden="true"
            className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
          />
        )}
      </summary>
      <div className="border-t border-border px-4 py-4 sm:px-5">{children}</div>
    </details>
  );
}

export function ProgrammingFeedback({
  state,
}: {
  state: ProgrammingActionState;
}) {
  return state.error ? (
    <p role="alert" className="text-sm text-destructive">
      {state.error}
    </p>
  ) : state.message ? (
    <p role="status" className="text-sm text-success">
      {state.message}
    </p>
  ) : null;
}

const DISCIPLINE_PRESETS = [
  "Boxeo",
  "Taekwondo",
  "Yoga",
  "Personalizado",
  "Fútbol",
  "Natación",
  "Karate",
  "Defensa personal",
] as const;

export function DisciplineCreationForm({
  onCreated,
}: {
  onCreated: (value: DisciplineOption) => void;
}) {
  const [name, setName] = useState("");
  const [state, action, pending] = useActionState(
    async (previous: ProgrammingActionState, data: FormData) => {
      const result = await createDisciplineAction(previous, data);
      if (result.created) {
        onCreated(result.created);
        setName("");
      }
      return result;
    },
    initialState,
  );

  return (
    <form action={action} className="space-y-4">
      {/* Preset chips */}
      <div>
        <p className="text-sm font-semibold text-foreground">
          Selecciona una disciplina
        </p>
        <div
          role="group"
          aria-label="Disciplinas sugeridas"
          className="mt-2 flex flex-wrap gap-2"
        >
          {DISCIPLINE_PRESETS.map((preset) => {
            const isSelected = name === preset;
            return (
              <button
                key={preset}
                type="button"
                disabled={pending}
                aria-pressed={isSelected}
                onClick={() => setName(isSelected ? "" : preset)}
                className={[
                  "inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                  "disabled:pointer-events-none disabled:opacity-50",
                  isSelected
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-surface-raised text-foreground hover:border-primary/50 hover:bg-primary/8 hover:text-primary",
                ].join(" ")}
              >
                {preset}
              </button>
            );
          })}
        </div>
      </div>

      {/* Free-text field for custom discipline */}
      <label className={programmingLabelClass}>
        O escribe una nueva
        <input
          name="name"
          required
          maxLength={100}
          value={name}
          onChange={(event) => setName(event.target.value)}
          disabled={pending}
          className={programmingFieldClass}
          placeholder="Pilates, CrossFit, Escalada…"
        />
      </label>

      <ProgrammingButton
        type="submit"
        isLoading={pending}
        disabled={!name.trim()}
      >
        Crear disciplina
      </ProgrammingButton>

      <ProgrammingFeedback state={state} />
    </form>
  );
}

export function ClassCreationForm({
  disciplines,
  defaultDisciplineId = "",
  onCreated,
}: {
  disciplines: DisciplineOption[];
  defaultDisciplineId?: string;
  onCreated: (value: ClassTemplateOption) => void;
}) {
  const helpId = useId();
  const [disciplineId, setDisciplineId] = useState(defaultDisciplineId);
  const [name, setName] = useState("");
  const [capacity, setCapacity] = useState("16");
  const [state, action, pending] = useActionState(
    async (previous: ProgrammingActionState, data: FormData) => {
      const result = await createClassTemplateAction(previous, data);
      if (result.created) {
        onCreated({
          ...result.created,
          disciplineName:
            disciplines.find((item) => item.id === disciplineId)?.name ?? "",
          capacity: Number(capacity),
        });
        setName("");
        setCapacity("16");
      }
      return result;
    },
    initialState,
  );
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      {disciplines.length === 0 ? (
        <p id={helpId} className="text-sm text-muted-foreground sm:col-span-2">
          Crea primero una disciplina con el formulario de arriba.
        </p>
      ) : null}
      <label className={programmingLabelClass}>
        Deporte o disciplina
        <select
          name="disciplineId"
          required
          value={disciplineId}
          onChange={(event) => setDisciplineId(event.target.value)}
          disabled={pending || disciplines.length === 0}
          aria-describedby={disciplines.length === 0 ? helpId : undefined}
          className={programmingFieldClass}
        >
          <option value="">Selecciona una disciplina</option>
          {disciplines.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </label>
      <label className={programmingLabelClass}>
        Nombre de la clase
        <input
          name="className"
          required
          maxLength={100}
          value={name}
          onChange={(event) => setName(event.target.value)}
          disabled={pending || disciplines.length === 0}
          className={programmingFieldClass}
          placeholder="Yoga inicial"
        />
      </label>
      <label className={programmingLabelClass}>
        Capacidad
        <input
          name="capacity"
          type="number"
          min={1}
          max={500}
          step={1}
          required
          value={capacity}
          onChange={(event) => setCapacity(event.target.value)}
          disabled={pending || disciplines.length === 0}
          className={programmingFieldClass}
        />
      </label>
      <div className="flex items-end">
        <ProgrammingButton
          type="submit"
          disabled={disciplines.length === 0}
          isLoading={pending}
        >
          Crear clase
        </ProgrammingButton>
      </div>
      <div className="sm:col-span-2">
        <ProgrammingFeedback state={state} />
      </div>
    </form>
  );
}

export function LocationCreationForm({
  onCreated,
}: {
  onCreated: (value: DayLocation) => void;
}) {
  const [name, setName] = useState("");
  const [type, setType] = useState("external_gym");
  const [address, setAddress] = useState("");
  const [state, action, pending] = useActionState(
    async (previous: ProgrammingActionState, data: FormData) => {
      const result = await createLocationAction(previous, data);
      if (result.created) {
        onCreated({ ...result.created, address: address.trim() || null });
        setName("");
        setAddress("");
      }
      return result;
    },
    initialState,
  );
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      <label className={programmingLabelClass}>
        Nombre del lugar
        <input
          name="name"
          required
          maxLength={100}
          value={name}
          onChange={(event) => setName(event.target.value)}
          disabled={pending}
          className={programmingFieldClass}
          placeholder="Parque Norte"
        />
      </label>
      <label className={programmingLabelClass}>
        Tipo
        <select
          name="type"
          value={type}
          onChange={(event) => setType(event.target.value)}
          disabled={pending}
          className={programmingFieldClass}
        >
          <option value="external_gym">Gimnasio o salón</option>
          <option value="park">Parque</option>
          <option value="home">Domicilio</option>
          <option value="online">En línea</option>
        </select>
      </label>
      <label className={`${programmingLabelClass} sm:col-span-2`}>
        Dirección (opcional)
        <input
          name="address"
          maxLength={180}
          value={address}
          onChange={(event) => setAddress(event.target.value)}
          disabled={pending}
          className={programmingFieldClass}
          placeholder="Calle y número"
        />
      </label>
      <div className="sm:col-span-2">
        <ProgrammingButton type="submit" isLoading={pending}>
          Añadir ubicación
        </ProgrammingButton>
      </div>
      <div className="sm:col-span-2">
        <ProgrammingFeedback state={state} />
      </div>
    </form>
  );
}
