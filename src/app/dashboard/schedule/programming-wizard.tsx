"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CalendarDays, Check, ChevronLeft, ChevronRight, Dumbbell, Plus, Tags, Trash2 } from "lucide-react";
import type { ClassTemplateOption, DisciplineOption } from "@/application/instructor-operations/ports/schedule-catalog-port";
import type { DayLocation } from "@/domain/instructor-operations/instructor-day";
import { Surface } from "@/presentation/components/primitives";
import { operationalTimezone } from "./session-presentation";
import {
  CatalogCreationPanel, ClassCreationForm, DisciplineCreationForm, LocationCreationForm,
  ProgrammingFeedback, programmingFieldClass as fieldClass, programmingLabelClass as labelClass,
  ProgrammingButton as Button,
} from "./programming-catalog-forms";
import { previewProgrammingAction, saveProgrammingAction, type ProgrammingActionState } from "./programming-actions";
import { addProgrammingDays, endTimeForDuration, programmingDateLabel, programmingDays } from "./programming-time";

interface Slot {
  key: string;
  dayOfWeek: number;
  startsAt: string;
  endsAt: string;
  locationId: string;
}

interface Props {
  disciplines: DisciplineOption[];
  templates: ClassTemplateOption[];
  locations: DayLocation[];
  today: string;
  throughDate: string;
  initialMode?: "weekly" | "once";
  preset?: {
    classTemplateId: string;
    locationId: string;
    timezone: string;
    instructorMembershipId?: string;
    slots: Omit<Slot, "key">[];
  };
  onDirtyChange?: (dirty: boolean) => void;
  onDisciplineCreated: (value: DisciplineOption) => void;
  onClassCreated: (value: ClassTemplateOption) => void;
  onLocationCreated: (value: DayLocation) => void;
}

const steps = ["Qué impartes", "Dónde", "Cuándo", "Revisar"];
const initialFeedback: ProgrammingActionState = { error: null, message: null };
const timezoneOptions = [operationalTimezone, "America/Lima", "America/Bogota", "America/Argentina/Buenos_Aires", "America/Mexico_City"];
const detailsClass = "rounded-xl border border-border p-4";

async function runProgrammingAction(
  action: (previous: ProgrammingActionState, data: FormData) => Promise<ProgrammingActionState>,
  previous: ProgrammingActionState,
  data: FormData,
): Promise<ProgrammingActionState> {
  try {
    return await action(previous, data);
  } catch (error) {
    if (error instanceof TypeError && /fetch|network|load failed/i.test(error.message)) {
      return { error: "No se pudo confirmar la respuesta. Comprueba tu conexión y reintenta sin cambiar los datos.", message: null };
    }
    throw error;
  }
}

export function ProgrammingWizard({
  disciplines, templates, locations, today, throughDate, initialMode = "weekly", preset, onDirtyChange,
  onDisciplineCreated, onClassCreated, onLocationCreated,
}: Props) {
  const [step, setStep] = useState(preset ? 2 : 0);
  const [discipline, setDiscipline] = useState(templates.find((item) => item.id === preset?.classTemplateId)?.disciplineName || "");
  const [classId, setClassId] = useState(preset?.classTemplateId || "");
  const [locationId, setLocationId] = useState(preset?.locationId || "");
  const [responsibleInstructor, setResponsibleInstructor] = useState(preset?.instructorMembershipId);
  const [selectedMode, setMode] = useState<"weekly" | "once" | null>(null);
  const mode = selectedMode ?? initialMode;
  const [startsAt, setStartsAt] = useState("18:00");
  const [endsAt, setEndsAt] = useState("19:00");
  const [duration, setDuration] = useState("60");
  const [date, setDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [otherDay, setOtherDay] = useState(false);
  const [fromDate, setFromDate] = useState(today);
  const [untilDate, setUntilDate] = useState(throughDate);
  const [timezone, setTimezone] = useState(preset?.timezone || operationalTimezone);
  const [waitlistEnabled, setWaitlistEnabled] = useState(true);
  const [personalized, setPersonalized] = useState(Boolean(preset));
  const [slots, setSlots] = useState<Slot[]>(preset ? preset.slots.map((slot, index) => ({ ...slot, key: `preset-${index}` })) : [1, 3, 5].map((day) => ({
    key: `day-${day}`, dayOfWeek: day, startsAt: "18:00", endsAt: "19:00", locationId: "",
  })));
  const [operationId, setOperationId] = useState("");
  const [intent, setIntent] = useState("publish");
  const [allowConflict, setAllowConflict] = useState(false);
  const [review, setReview] = useState<ProgrammingActionState | null>(null);
  const [saveFeedback, setSaveFeedback] = useState<ProgrammingActionState>(initialFeedback);
  const [disciplineOpen, setDisciplineOpen] = useState(false);
  const [classOpen, setClassOpen] = useState(false);
  const [locationOpen, setLocationOpen] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const mounted = useRef(false);
  const [published, setPublished] = useState(false);

  const selectedClass = templates.find((item) => item.id === classId);
  const selectedLocation = locations.find((item) => item.id === locationId);
  const availableDisciplines = [...new Set([...disciplines.map((item) => item.name), ...templates.map((item) => item.disciplineName)])];
  const filteredClasses = discipline ? templates.filter((item) => item.disciplineName === discipline) : templates;
  const selectedDiscipline = disciplines.find((item) => item.name === discipline);
  const payload = {
    operationId,
    classTemplateId: classId,
    timezone,
    mode,
    fromDate: mode === "once" ? date : fromDate,
    throughDate: mode === "once" ? (otherDay ? endDate : date) : untilDate,
    waitlistEnabled,
    allowConflict,
    instructorMembershipId: responsibleInstructor,
    slots: mode === "once"
      ? [{ dayOfWeek: new Date(`${date}T12:00:00Z`).getUTCDay(), startsAt, endsAt, locationId, date, endDate: otherDay ? endDate : date }]
      : slots.map(({ dayOfWeek, startsAt: start, endsAt: end, locationId: place }) => ({ dayOfWeek, startsAt: start, endsAt: end, locationId: place || locationId })),
  };
  const reviewedPayload = useRef<typeof payload | null>(null);
  const reviewedFingerprint = useRef<string | null>(null);
  const [previewState, previewAction, previewPending] = useActionState(
    async (previous: ProgrammingActionState, data: FormData) => {
      const id = operationId || crypto.randomUUID();
      const nextIntent = String(data.get("intent") || "publish");
      setOperationId(id);
      const request = { ...payload, operationId: id };
      data.set("programming", JSON.stringify(request));
      const result = await runProgrammingAction(previewProgrammingAction, previous, data);
      setIntent(nextIntent);
      setSaveFeedback(initialFeedback);
      if (result.preview && !result.error) {
        reviewedPayload.current = request;
        reviewedFingerprint.current = result.preview.fingerprint ?? null;
      }
      setReview(result);
      setAllowConflict(false);
      if (result.preview && !result.error) setStep(3);
      return result;
    }, initialFeedback,
  );
  const [savedState, saveAction, savePending] = useActionState(
    async (previous: ProgrammingActionState, data: FormData) => {
      if (!reviewedPayload.current) return { error: "Revisa la programación antes de guardarla.", message: null };
      data.set("programming", JSON.stringify({ ...reviewedPayload.current, allowConflict }));
      data.set("previewFingerprint", reviewedFingerprint.current ?? "");
      const result = await runProgrammingAction(saveProgrammingAction, previous, data);
      setSaveFeedback(result);
      if (result.message && !result.error) setPublished(true);
      if (result.preview) setReview(result);
      return result;
    }, initialFeedback,
  );
  const pending = previewPending || savePending;
  const dirty = Boolean(classId || locationId || discipline);

  useEffect(() => { onDirtyChange?.(dirty && !published); }, [dirty, published, onDirtyChange]);
  useEffect(() => {
    if (mounted.current) heading.current?.focus();
    mounted.current = true;
  }, [step, published]);
  useEffect(() => {
    if (!dirty || published) return;
    const preventLeaving = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", preventLeaving);
    return () => window.removeEventListener("beforeunload", preventLeaving);
  }, [dirty, published]);

  function invalidateReview() {
    reviewedPayload.current = null;
    reviewedFingerprint.current = null;
    setReview(null);
    setAllowConflict(false);
    setOperationId("");
    setSaveFeedback(initialFeedback);
  }
  function changeCommonTime(start: string, end: string) {
    setStartsAt(start);
    setEndsAt(end);
    if (!personalized) setSlots((current) => current.map((slot) => ({ ...slot, startsAt: start, endsAt: end })));
    invalidateReview();
  }
  function changeDuration(value: string) {
    setDuration(value);
    const end = endTimeForDuration(startsAt, Number(value));
    if (!end) return;
    changeCommonTime(startsAt, end.time);
    if (mode === "once") {
      setOtherDay(end.nextDays > 0);
      setEndDate(addProgrammingDays(date, end.nextDays));
    }
  }
  function toggleDay(day: number) {
    setSlots((current) => current.some((slot) => slot.dayOfWeek === day)
      ? current.filter((slot) => slot.dayOfWeek !== day)
      : [...current, { key: crypto.randomUUID(), dayOfWeek: day, startsAt, endsAt, locationId }]);
    invalidateReview();
  }
  function updateSlot(key: string, values: Partial<Slot>) {
    setSlots((current) => current.map((slot) => slot.key === key ? { ...slot, ...values } : slot));
    invalidateReview();
  }
  function back() {
    if (pending) return;
    setStep((current) => Math.max(0, current - 1));
    setAllowConflict(false);
  }
  function continueStep(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMode(mode);
    setStep((current) => current + 1);
  }
  const conflictList = review?.preview?.conflicts ?? [];
  const summary = (
    <div className="space-y-3 text-sm">
      <p className="font-bold [overflow-wrap:anywhere]">{selectedClass?.name || "Selecciona una clase"}</p>
      {selectedClass ? <p className="text-muted-foreground">{selectedClass.disciplineName} · {selectedClass.capacity} cupos</p> : null}
      <p className="[overflow-wrap:anywhere]">{selectedLocation?.name || "Selecciona un lugar"}</p>
      {selectedLocation?.address ? <p className="text-muted-foreground [overflow-wrap:anywhere]">{selectedLocation.address}</p> : null}
      {mode === "weekly"
        ? <ul className="space-y-2">{[...slots].sort((a, b) => ((a.dayOfWeek + 6) % 7) - ((b.dayOfWeek + 6) % 7)).map((slot) => <li key={slot.key} className="[overflow-wrap:anywhere]">
          <span className="font-semibold">{programmingDays.find((day) => day.value === slot.dayOfWeek)?.name}</span>{" "}
          {slot.startsAt}–{slot.endsAt}
          {slot.locationId && slot.locationId !== locationId ? ` · ${locations.find((item) => item.id === slot.locationId)?.name}` : ""}
        </li>)}</ul>
        : <p>{programmingDateLabel(date)} · {startsAt}–{endsAt}{otherDay ? ` (${programmingDateLabel(endDate)})` : ""}</p>}
      <p className="text-muted-foreground">Zona horaria: {timezone.replaceAll("_", " ")}</p>
      {responsibleInstructor ? <p className="text-muted-foreground">Se conserva el instructor responsable de estos horarios.</p> : null}
    </div>
  );

  if (published) return (
    <Surface className="space-y-5 border-success/30" aria-labelledby="programming-complete">
      <Check aria-hidden="true" className="h-8 w-8 text-success" />
      <h2 ref={heading} tabIndex={-1} id="programming-complete" className="text-xl font-bold outline-none">Programación guardada</h2>
      <ProgrammingFeedback state={saveFeedback.error ? saveFeedback : initialFeedback} />
      {summary}
      <p className="text-sm text-muted-foreground">Las sesiones que ya existían conservan sus cambios, cupos, reservas y estado.</p>
      <div className="flex flex-wrap gap-3">
        <Link href="/dashboard/schedule" className="inline-flex min-h-11 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground">Ver sesiones en la agenda</Link>
        <Button onClick={() => {
          setPublished(false); setStep(0); setReview(null); setOperationId(""); setAllowConflict(false); setResponsibleInstructor(undefined); reviewedPayload.current = null; reviewedFingerprint.current = null;
        }}>Programar otra clase</Button>
      </div>
    </Surface>
  );

  return (
    <section aria-labelledby="programming-wizard-heading" className="space-y-5">
      <div>
        <h2 id="programming-wizard-heading" className="text-xl font-bold">Programar clase</h2>
        <p className="mt-1 text-sm text-muted-foreground">Elige qué impartes, dónde y cuándo. Revisa todo antes de publicar.</p>
      </div>
      <ol aria-label="Pasos para programar" className="grid grid-cols-4 gap-2">
        {steps.map((label, index) => <li key={label} aria-current={index === step ? "step" : undefined} className={`min-w-0 rounded-lg border px-1 py-3 text-center text-xs font-semibold sm:text-sm ${index === step ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}>
          <span className="mb-1 block">{index < step ? <Check aria-label="Completado" className="mx-auto h-4 w-4" /> : index + 1}</span>{label}
        </li>)}
      </ol>
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <Surface className="min-w-0 space-y-5 p-4 sm:p-6">
          <h3 ref={heading} tabIndex={-1} className="text-lg font-bold outline-none">{step + 1}. {steps[step]}</h3>
          {step === 0 ? <>
            <form onSubmit={continueStep} className="space-y-5">
              <label className={labelClass}>Disciplina
                <select value={discipline} onChange={(event) => { setDiscipline(event.target.value); setClassId(""); invalidateReview(); }} className={fieldClass}>
                  <option value="">Todas las disciplinas</option>
                  {availableDisciplines.map((name) => <option key={name} value={name}>{name}</option>)}
                </select>
              </label>
              <label className={labelClass}>Clase
                <select required value={classId} onChange={(event) => { setClassId(event.target.value); invalidateReview(); }} className={fieldClass}>
                  <option value="">Selecciona una clase</option>
                  {filteredClasses.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.capacity} cupos</option>)}
                </select>
              </label>
              {templates.length === 0 ? <p className="text-sm text-muted-foreground">Comienza creando tu disciplina y tu primera clase aquí mismo.</p> : null}
              <Button type="submit" variant="primary">Continuar <ChevronRight aria-hidden="true" className="h-4 w-4" /></Button>
            </form>
            <CatalogCreationPanel
              title="Crear una disciplina"
              description="Agrupa tus clases por actividad, como boxeo, yoga o pilates."
              icon={Tags}
              open={disciplineOpen || disciplines.length === 0}
              onToggle={(event) => setDisciplineOpen(event.currentTarget.open)}
            >
              <DisciplineCreationForm onCreated={(value) => { onDisciplineCreated(value); setDiscipline(value.name); setClassId(""); setDisciplineOpen(false); setClassOpen(true); invalidateReview(); }} />
            </CatalogCreationPanel>
            <CatalogCreationPanel
              title="Crear una nueva clase"
              description="Define el grupo y sus cupos; luego podrás asignarle horarios y lugares."
              icon={Dumbbell}
              open={classOpen || templates.length === 0}
              onToggle={(event) => setClassOpen(event.currentTarget.open)}
            >
              <ClassCreationForm key={selectedDiscipline?.id || "all"} disciplines={disciplines} defaultDisciplineId={selectedDiscipline?.id} onCreated={(value) => { onClassCreated(value); setClassId(value.id); setDiscipline(value.disciplineName); setClassOpen(false); invalidateReview(); }} />
            </CatalogCreationPanel>
          </> : null}
          {step === 1 ? <>
            <form onSubmit={continueStep} className="space-y-5">
              <label className={labelClass}>Lugar
                <select value={locationId} required onChange={(event) => { const id = event.target.value; setLocationId(id); setSlots((current) => current.map((slot) => ({ ...slot, locationId: slot.locationId === locationId ? id : slot.locationId }))); invalidateReview(); }} className={fieldClass}>
                  <option value="">Selecciona un lugar</option>{locations.map((item) => <option key={item.id} value={item.id}>{item.name}{item.address ? ` · ${item.address}` : ""}</option>)}
                </select>
              </label>
              <p className="text-sm text-muted-foreground">Este lugar se usará para los horarios nuevos. Puedes cambiarlo por día sin duplicar tu clase.</p>
              <div className="flex flex-wrap gap-3"><Button onClick={back}>Atrás</Button><Button type="submit" variant="primary">Continuar <ChevronRight aria-hidden="true" className="h-4 w-4" /></Button></div>
            </form>
            <details open={locationOpen || locations.length === 0} onToggle={(event) => setLocationOpen(event.currentTarget.open)} className={detailsClass}>
              <summary className="min-h-11 cursor-pointer content-center text-sm font-semibold text-primary">Crear un lugar</summary>
              <div className="mt-3"><LocationCreationForm onCreated={(value) => { onLocationCreated(value); setLocationId(value.id); setLocationOpen(false); invalidateReview(); }} /></div>
            </details>
          </> : null}
          {step === 2 ? (
            <form action={previewAction} className="space-y-5">
              <fieldset disabled={pending} className="min-w-0 space-y-5">
                <legend className="sr-only">Fechas y horarios de la clase</legend>
                <div className="grid grid-cols-2 gap-2">
                  {([{ value: "once", label: "Una sola fecha" }, { value: "weekly", label: "Se repite semanalmente" }] as const).map((item) => <label key={item.value} className={`flex min-h-14 cursor-pointer items-center gap-2 rounded-xl border p-3 text-sm font-semibold ${mode === item.value ? "border-primary bg-primary/10" : "border-border"}`}>
                    <input type="radio" name="mode" value={item.value} checked={mode === item.value} onChange={() => { setMode(item.value); invalidateReview(); }} className="accent-primary" />{item.label}
                  </label>)}
                </div>
                {mode === "weekly" ? <fieldset>
                  <legend className="mb-2 text-sm font-semibold">Días de la semana</legend>
                  <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
                    {programmingDays.map((day) => <button key={day.value} type="button" aria-label={day.name} aria-pressed={slots.some((slot) => slot.dayOfWeek === day.value)} onClick={() => toggleDay(day.value)} className={`min-h-11 rounded-lg border px-2 text-sm font-semibold ${slots.some((slot) => slot.dayOfWeek === day.value) ? "border-primary bg-primary/10 text-primary" : "border-border"}`}>{day.short}</button>)}
                  </div>
                  {slots.length === 0 ? <p role="alert" className="mt-2 text-sm text-destructive">Selecciona al menos un día.</p> : null}
                </fieldset> : (
                  <label className={labelClass}>Fecha
                    <input type="date" required value={date} onChange={(event) => { setDate(event.target.value); if (!otherDay || endDate < event.target.value) setEndDate(event.target.value); invalidateReview(); }} className={fieldClass} />
                  </label>
                )}
                {!personalized || mode === "once" ? <>
                  <div className="grid min-w-0 gap-4 sm:grid-cols-2">
                    <label className={labelClass}>Hora de inicio
                      <input type="time" required value={startsAt} onChange={(event) => {
                        const start = event.target.value; const end = endTimeForDuration(start, Number(duration));
                        changeCommonTime(start, end?.time || endsAt);
                        if (mode === "once" && end) { setOtherDay(end.nextDays > 0); setEndDate(addProgrammingDays(date, end.nextDays)); }
                      }} className={fieldClass} />
                    </label>
                    <label className={labelClass}>Duración en minutos
                      <input type="number" min={1} max={mode === "weekly" ? 1439 : 2880} value={duration} onChange={(event) => changeDuration(event.target.value)} className={fieldClass} />
                    </label>
                  </div>
                  <div className="flex flex-wrap gap-2">{[45, 60, 90].map((value) => <Button key={value} aria-pressed={duration === String(value)} onClick={() => changeDuration(String(value))}>{value} min</Button>)}</div>
                  <label className={labelClass}>Hora de término
                    <input type="time" required value={endsAt} onChange={(event) => {
                      changeCommonTime(startsAt, event.target.value);
                      const [sh, sm] = startsAt.split(":").map(Number); const [eh, em] = event.target.value.split(":").map(Number);
                      const extraDays = mode === "once" && otherDay ? (Date.parse(`${endDate}T12:00:00Z`) - Date.parse(`${date}T12:00:00Z`)) / 86_400_000 : 0;
                      const minutes = (eh * 60 + em) - (sh * 60 + sm) + extraDays * 1440;
                      if (minutes > 0) setDuration(String(minutes)); else setDuration("");
                    }} className={fieldClass} />
                  </label>
                  {mode === "weekly" && endsAt <= startsAt ? <p role="alert" className="text-sm text-destructive">El horario semanal debe terminar después de comenzar, dentro del mismo día.</p> : null}
                </> : null}
                {mode === "once" ? <>
                  <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={otherDay} onChange={(event) => { setOtherDay(event.target.checked); setEndDate(event.target.checked ? addProgrammingDays(date, 1) : date); invalidateReview(); }} className="h-4 w-4 accent-primary" />Termina otro día</label>
                  {otherDay ? <label className={labelClass}>Fecha de término<input type="date" min={date} required value={endDate} onChange={(event) => { setEndDate(event.target.value); invalidateReview(); }} className={fieldClass} /></label> : null}
                </> : <>
                  {!personalized ? <Button onClick={() => setPersonalized(true)}>Personalizar horario por día</Button> : (
                    <div className="space-y-4">
                      <p className="text-sm text-muted-foreground">Ajusta cada franja y su lugar. Puedes añadir más de una franja el mismo día.</p>
                      {programmingDays.filter((day) => slots.some((slot) => slot.dayOfWeek === day.value)).map((day) => <fieldset key={day.value} className="min-w-0 rounded-xl border border-border p-3">
                        <legend className="px-1 text-sm font-bold">{day.name}</legend>
                        <div className="space-y-4">{slots.filter((slot) => slot.dayOfWeek === day.value).map((slot, index) => <div key={slot.key} className="grid min-w-0 gap-3 border-b border-border pb-4 last:border-0 sm:grid-cols-2">
                          <label className={labelClass}>Inicio · {day.name} {index + 1}<input type="time" required value={slot.startsAt} onChange={(event) => updateSlot(slot.key, { startsAt: event.target.value })} className={fieldClass} /></label>
                          <label className={labelClass}>Término · {day.name} {index + 1}<input type="time" required value={slot.endsAt} onChange={(event) => updateSlot(slot.key, { endsAt: event.target.value })} className={fieldClass} /></label>
                          <label className={labelClass}>Lugar · {day.name} {index + 1}<select value={slot.locationId || locationId} onChange={(event) => updateSlot(slot.key, { locationId: event.target.value })} required className={fieldClass}>{locations.map((item) => <option key={item.id} value={item.id}>{item.name}{item.address ? ` · ${item.address}` : ""}</option>)}</select></label>
                          <Button aria-label={`Eliminar franja ${index + 1} de ${day.name}`} onClick={() => { setSlots((current) => current.filter((item) => item.key !== slot.key)); invalidateReview(); }}><Trash2 aria-hidden="true" className="h-4 w-4" />Eliminar franja</Button>
                          {slot.endsAt <= slot.startsAt ? <p role="alert" className="text-sm text-destructive sm:col-span-2">El término debe ser posterior al inicio.</p> : null}
                        </div>)}</div>
                        <Button className="mt-3" disabled={slots.length >= 28} onClick={() => { setSlots((current) => [...current, { key: crypto.randomUUID(), dayOfWeek: day.value, startsAt, endsAt, locationId }]); invalidateReview(); }}><Plus aria-hidden="true" className="h-4 w-4" />Añadir franja · {day.name}</Button>
                      </fieldset>)}
                    </div>
                  )}
                  <fieldset className="grid min-w-0 gap-4 sm:grid-cols-2">
                    <legend className="mb-2 text-sm font-semibold">Período para publicar</legend>
                    <label className={labelClass}>Desde<input type="date" required value={fromDate} onChange={(event) => { setFromDate(event.target.value); invalidateReview(); }} className={fieldClass} /></label>
                    <label className={labelClass}>Hasta (máximo 8 semanas)<input type="date" required min={fromDate} max={fromDate ? addProgrammingDays(fromDate, 56) : undefined} value={untilDate} onChange={(event) => { setUntilDate(event.target.value); invalidateReview(); }} className={fieldClass} /></label>
                  </fieldset>
                </>}
                <details className={detailsClass}>
                  <summary className="min-h-11 cursor-pointer content-center text-sm font-semibold">Opciones · {timezone.replaceAll("_", " ")}</summary>
                  <div className="mt-3 space-y-4">
                    <label className={labelClass}>Zona horaria<select value={timezone} onChange={(event) => { setTimezone(event.target.value); invalidateReview(); }} className={fieldClass}>{[...new Set([timezone, ...timezoneOptions])].map((value) => <option key={value} value={value}>{value.replaceAll("_", " ")}</option>)}</select></label>
                    <p className="text-xs text-muted-foreground">Se comprueban las fechas en esta zona. La agenda se muestra en hora de Santiago.</p>
                    <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={waitlistEnabled} onChange={(event) => { setWaitlistEnabled(event.target.checked); invalidateReview(); }} className="h-4 w-4 accent-primary" />Permitir lista de espera</label>
                  </div>
                </details>
                <ProgrammingFeedback state={previewState.error ? previewState : initialFeedback} />
                <div className="flex flex-wrap gap-3 border-t border-border pb-[env(safe-area-inset-bottom)] pt-5">
                  <Button onClick={back} disabled={pending}><ChevronLeft aria-hidden="true" className="h-4 w-4" />Atrás</Button>
                  <Button type="submit" name="intent" value="publish" variant="primary" isLoading={previewPending} disabled={mode === "weekly" && (slots.length === 0 || slots.some((slot) => slot.endsAt <= slot.startsAt))}>Revisar para publicar</Button>
                  {mode === "weekly" ? <Button type="submit" name="intent" value="save" disabled={slots.length === 0 || slots.some((slot) => slot.endsAt <= slot.startsAt)}>Solo guardar horarios</Button> : null}
                </div>
              </fieldset>
            </form>
          ) : null}
          {step === 3 && review?.preview ? (
            <form action={saveAction} className="space-y-5">
              <input type="hidden" name="programming" value={JSON.stringify(payload)} />
              <input type="hidden" name="intent" value={intent} />
              <div className="lg:hidden">{summary}</div>
              <p className="text-sm">{mode === "weekly" ? `${programmingDateLabel(fromDate)} al ${programmingDateLabel(untilDate)}` : programmingDateLabel(date)}</p>
              <p role="status" className="rounded-xl bg-primary/10 p-4 font-semibold">
                {intent === "save"
                  ? `Se guardarán ${slots.length} horarios sin publicar sesiones.`
                  : `${review.preview.newCount === 1 ? "1 sesión nueva" : `${review.preview.newCount} sesiones nuevas`} · ${review.preview.existingCount === 1 ? "1 existente se conservará" : `${review.preview.existingCount} existentes se conservarán`}.`}
              </p>
              <p className="text-sm text-muted-foreground">No se sobrescriben sesiones existentes, cancelaciones, reservas ni cambios individuales. Guardar horarios no modifica sesiones ya publicadas.</p>
              {conflictList.length > 0 ? <div className="space-y-3 rounded-xl border border-warning/40 bg-warning/10 p-4">
                <h4 className="font-semibold">Hay cruces de horarios</h4>
                <ul className="list-disc space-y-2 pl-5 text-sm">{conflictList.map((conflict, index) => <li key={index}>{conflict.message}</li>)}</ul>
                <label className="flex min-h-11 items-start gap-2 text-sm font-semibold"><input type="checkbox" checked={allowConflict} onChange={(event) => setAllowConflict(event.target.checked)} disabled={pending} className="mt-1 h-4 w-4 shrink-0 accent-primary" />Revisé estos cruces y confirmo que puedo impartir estas clases.</label>
                <Button onClick={back} disabled={pending}>Cambiar horario</Button>
              </div> : null}
              <p className="text-xs text-muted-foreground">Los cruces se comprueban dentro del período seleccionado. Las horas inexistentes o ambiguas por cambio de horario requieren otra selección.</p>
              {review.preview.occurrences.length > 0 ? <details className={detailsClass}>
                <summary className="min-h-11 cursor-pointer content-center text-sm font-semibold">Ver fechas y horarios ({review.preview.occurrences.length})</summary>
                <ul className="mt-3 max-h-72 space-y-3 overflow-y-auto text-sm">{review.preview.occurrences.map((occurrence, index) => <li key={index}>
                  <time dateTime={occurrence.startsAt}>{new Intl.DateTimeFormat("es-CL", { timeZone: timezone, dateStyle: "medium", timeStyle: "short" }).format(new Date(occurrence.startsAt))}</time>
                  {" – "}<time dateTime={occurrence.endsAt}>{new Intl.DateTimeFormat("es-CL", { timeZone: timezone, dateStyle: "medium", timeStyle: "short" }).format(new Date(occurrence.endsAt))}</time>
                  {" · "}{locations.find((item) => item.id === occurrence.locationId)?.name}
                </li>)}</ul>
              </details> : null}
              <ProgrammingFeedback state={savedState} />
              <div className="flex flex-wrap gap-3">
                <Button onClick={back} disabled={pending}>Atrás</Button>
                <Button type="submit" variant="primary" isLoading={savePending} disabled={pending || (conflictList.length > 0 && !allowConflict) || (intent === "publish" && review.preview.newCount === 0 && review.preview.existingCount === 0)}>
                  <CalendarDays aria-hidden="true" className="h-4 w-4" />{intent === "save" ? "Guardar horarios sin publicar" : "Publicar clases"}
                </Button>
              </div>
            </form>
          ) : null}
        </Surface>
        <Surface className="hidden min-w-0 space-y-4 lg:sticky lg:top-28 lg:block" aria-label="Resumen de la clase">
          <h3 className="font-bold">Tu programación</h3>{summary}
        </Surface>
      </div>
    </section>
  );
}
