"use client";

import { useActionState, useId, useState, type ComponentProps } from "react";
import type { DisciplineOption, ClassTemplateOption } from "@/application/instructor-operations/ports/schedule-catalog-port";
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
export const programmingLabelClass = "flex min-w-0 flex-col text-sm font-semibold";
const initialState: ProgrammingActionState = { error: null, message: null };

export function ProgrammingButton({ className, ...props }: ComponentProps<typeof Button>) {
  return <Button {...props} className={`min-h-11 ${className ?? ""}`} />;
}

export function ProgrammingFeedback({ state }: { state: ProgrammingActionState }) {
  return state.error
    ? <p role="alert" className="text-sm text-destructive">{state.error}</p>
    : state.message
      ? <p role="status" className="text-sm text-success">{state.message}</p>
      : null;
}

export function DisciplineCreationForm({ onCreated }: { onCreated: (value: DisciplineOption) => void }) {
  const [name, setName] = useState("");
  const [state, action, pending] = useActionState(async (previous: ProgrammingActionState, data: FormData) => {
    const result = await createDisciplineAction(previous, data);
    if (result.created) {
      onCreated(result.created);
      setName("");
    }
    return result;
  }, initialState);
  return (
    <form action={action} className="space-y-4">
      <label className={programmingLabelClass}>Nombre de la disciplina
        <input name="name" required maxLength={100} value={name} onChange={(event) => setName(event.target.value)} disabled={pending} className={programmingFieldClass} placeholder="Yoga, Pilates, Fútbol…" />
      </label>
      <ProgrammingButton type="submit" isLoading={pending}>Crear disciplina</ProgrammingButton>
      <ProgrammingFeedback state={state} />
    </form>
  );
}

export function ClassCreationForm({
  disciplines, defaultDisciplineId = "", onCreated,
}: {
  disciplines: DisciplineOption[];
  defaultDisciplineId?: string;
  onCreated: (value: ClassTemplateOption) => void;
}) {
  const helpId = useId();
  const [disciplineId, setDisciplineId] = useState(defaultDisciplineId);
  const [name, setName] = useState("");
  const [capacity, setCapacity] = useState("16");
  const [state, action, pending] = useActionState(async (previous: ProgrammingActionState, data: FormData) => {
    const result = await createClassTemplateAction(previous, data);
    if (result.created) {
      onCreated({
        ...result.created,
        disciplineName: disciplines.find((item) => item.id === disciplineId)?.name ?? "",
        capacity: Number(capacity),
      });
      setName("");
      setCapacity("16");
    }
    return result;
  }, initialState);
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      {disciplines.length === 0 ? <p id={helpId} className="text-sm text-muted-foreground sm:col-span-2">Crea primero una disciplina con el formulario de arriba.</p> : null}
      <label className={programmingLabelClass}>Deporte o disciplina
        <select name="disciplineId" required value={disciplineId} onChange={(event) => setDisciplineId(event.target.value)} disabled={pending || disciplines.length === 0} aria-describedby={disciplines.length === 0 ? helpId : undefined} className={programmingFieldClass}>
          <option value="">Selecciona una disciplina</option>
          {disciplines.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
      </label>
      <label className={programmingLabelClass}>Nombre de la clase
        <input name="className" required maxLength={100} value={name} onChange={(event) => setName(event.target.value)} disabled={pending || disciplines.length === 0} className={programmingFieldClass} placeholder="Yoga inicial" />
      </label>
      <label className={programmingLabelClass}>Capacidad
        <input name="capacity" type="number" min={1} max={500} step={1} required value={capacity} onChange={(event) => setCapacity(event.target.value)} disabled={pending || disciplines.length === 0} className={programmingFieldClass} />
      </label>
      <div className="flex items-end"><ProgrammingButton type="submit" disabled={disciplines.length === 0} isLoading={pending}>Crear clase</ProgrammingButton></div>
      <div className="sm:col-span-2"><ProgrammingFeedback state={state} /></div>
    </form>
  );
}

export function LocationCreationForm({ onCreated }: { onCreated: (value: DayLocation) => void }) {
  const [name, setName] = useState("");
  const [type, setType] = useState("external_gym");
  const [address, setAddress] = useState("");
  const [state, action, pending] = useActionState(async (previous: ProgrammingActionState, data: FormData) => {
    const result = await createLocationAction(previous, data);
    if (result.created) {
      onCreated({ ...result.created, address: address.trim() || null });
      setName("");
      setAddress("");
    }
    return result;
  }, initialState);
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      <label className={programmingLabelClass}>Nombre del lugar
        <input name="name" required maxLength={100} value={name} onChange={(event) => setName(event.target.value)} disabled={pending} className={programmingFieldClass} placeholder="Parque Norte" />
      </label>
      <label className={programmingLabelClass}>Tipo
        <select name="type" value={type} onChange={(event) => setType(event.target.value)} disabled={pending} className={programmingFieldClass}>
          <option value="external_gym">Gimnasio o salón</option><option value="park">Parque</option><option value="home">Domicilio</option><option value="online">En línea</option>
        </select>
      </label>
      <label className={`${programmingLabelClass} sm:col-span-2`}>Dirección (opcional)
        <input name="address" maxLength={180} value={address} onChange={(event) => setAddress(event.target.value)} disabled={pending} className={programmingFieldClass} placeholder="Calle y número" />
      </label>
      <div className="sm:col-span-2"><ProgrammingButton type="submit" isLoading={pending}>Añadir ubicación</ProgrammingButton></div>
      <div className="sm:col-span-2"><ProgrammingFeedback state={state} /></div>
    </form>
  );
}
