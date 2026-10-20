"use client";

import { startTransition, useActionState, useState } from "react";
import { X } from "lucide-react";
import Link from "next/link";
import { Button } from "@/presentation/components/primitives";
import { enqueueOfflineCommand } from "@/application/synchronization/use-cases/enqueue-offline-command";
import type { AttendanceParticipant } from "@/domain/evolution-health-attendance/attendance";
import type { AttendanceStatus } from "@/domain/evolution-health-attendance/attendance";
import { createOfflineStore } from "@/infrastructure/composition/synchronization-composition";
import { saveAttendanceAction, type AttendanceFormState } from "./actions";
import { AttendanceStudentPicker } from "./attendance-student-picker";
import { formatActionError } from "@/app/_lib/format-error";

interface OfflineAttendanceFormState extends AttendanceFormState {
  pendingOffline: boolean;
}

const initialState: OfflineAttendanceFormState = {
  error: null,
  saved: false,
  pendingOffline: false,
};

export function AttendanceForm({
  sessionId,
  tenantId,
  recordedByMembershipId,
  batchOperationId,
  participants,
  operationIds,
}: {
  sessionId: string;
  tenantId: string;
  recordedByMembershipId: string;
  batchOperationId: string;
  participants: AttendanceParticipant[];
  operationIds: string[];
}) {
  const [added, setAdded] = useState<Array<AttendanceParticipant & { operationId: string; saved: boolean }>>([]);
  const [values, setValues] = useState<Record<string, { status: AttendanceStatus; note: string }>>({});
  const [additionMessage, setAdditionMessage] = useState("");
  const [dirty, setDirty] = useState(false);
  const roster = [
    ...participants.map((participant, index) => ({ ...participant, operationId: operationIds[index], saved: true })),
    ...added.filter((participant) => !participants.some((saved) => saved.studentId === participant.studentId)),
  ];

  async function submitAttendance(
    previousState: OfflineAttendanceFormState,
    formData: FormData,
  ): Promise<OfflineAttendanceFormState> {
    if (navigator.onLine) {
      const result = await saveAttendanceAction(previousState, formData);
      if (result.saved) {
        setAdded((items) => items.map((item) => ({ ...item, saved: true })));
        setAdditionMessage("");
        setDirty(false);
      }
      return { ...result, pendingOffline: false };
    }

    const studentIds = formData.getAll("studentId").map(String);
    const statuses = formData.getAll("status").map(String);
    const notes = formData.getAll("note").map(String);
    const itemOperationIds = formData.getAll("operationId").map(String);
    const offlineStore = createOfflineStore();
    try {
      try {
        await enqueueOfflineCommand(
          {
            operationId: batchOperationId,
            tenantId,
            type: "attendance.batch",
            payload: {
              sessionId,
              recordedByMembershipId,
              items: studentIds.map((studentId, index) => ({
                studentId,
                status: statuses[index] as AttendanceStatus,
                note: notes[index] || undefined,
                operationId: itemOperationIds[index],
              })),
            },
          },
          { offlineStore },
        );
      } finally {
        await offlineStore.close();
      }
    } catch (error) {
      return { error: formatActionError(error), saved: false, pendingOffline: false };
    }
    setAdded((items) => items.map((item) => ({ ...item, saved: true })));
    setAdditionMessage("");
    setDirty(false);
    return { error: null, saved: false, pendingOffline: true };
  }

  const [state, formAction, pending] = useActionState(
    submitAttendance,
    initialState,
  );

  return (
    <>
      <AttendanceStudentPicker
        selectedIds={new Set(roster.map((participant) => participant.studentId))}
        disabled={pending}
        onAdd={(students) => {
          const additions = students.filter((student) => !roster.some((item) => item.studentId === student.studentId));
          setAdded((items) => [...items, ...additions.map((student) => ({ ...student, withoutReservation: true, currentStatus: "present" as const, operationId: crypto.randomUUID(), saved: false }))]);
          setValues((current) => ({ ...current, ...Object.fromEntries(additions.map((student) => [student.studentId, { status: "present" as const, note: "" }])) }));
          setDirty(true);
          setAdditionMessage(`${additions.length} alumnos añadidos como presentes. Guarda la asistencia para confirmar.`);
        }}
      />
      {additionMessage ? <p role="status" className="mb-4 text-sm text-primary">{additionMessage}</p> : null}
      <h2 className="mb-3 font-semibold">Lista de asistencia <span className="ml-1 text-sm font-normal text-muted-foreground">({roster.length})</span></h2>
      {added.some((participant) => !participant.saved) ? <p className="mb-4 text-xs text-muted-foreground">Antes de registrar alumnos sin reserva, confirma sus condiciones de salud. Puedes consultar su ficha desde el nombre; las alertas de la sesión se actualizan al guardar.</p> : null}
      <form onSubmit={(event) => {
        event.preventDefault();
        if (pending) return;
        const formData = new FormData(event.currentTarget);
        startTransition(() => formAction(formData));
      }}>
      <input type="hidden" name="sessionId" value={sessionId} />
      <div className="divide-y divide-border rounded-xl border border-border bg-card px-4 shadow-lg shadow-black/10">
        {roster.length === 0 ? <p className="py-5 text-sm text-muted-foreground">Sin participantes confirmados. Añade a los alumnos que asistieron sin reserva para registrar su asistencia.</p> : null}
        {roster.map((participant) => (
          <fieldset
            key={participant.studentId}
            disabled={pending}
            className="grid gap-3 py-4 sm:grid-cols-[1fr_11rem_1fr] sm:items-center"
          >
            <legend className="sr-only">{participant.studentName}</legend>
            <input
              type="hidden"
              name="studentId"
              value={participant.studentId}
            />
            <input
              type="hidden"
              name="operationId"
              value={participant.operationId}
            />
            <div className="min-w-0">
              <Link
              href={`/dashboard/students/${participant.studentId}`}
              target={!participant.saved ? "_blank" : undefined}
              rel={!participant.saved ? "noopener noreferrer" : undefined}
              title={!participant.saved ? "Consultar ficha en una nueva pestaña" : undefined}
              className="font-semibold text-foreground"
            >
              {participant.studentName}
            </Link>
              {participant.withoutReservation ? (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-info/10 px-2 py-1 text-xs font-medium text-info">Sin reserva</span>
                  {!participant.saved ? <button type="button" disabled={pending} aria-label={`Quitar a ${participant.studentName} del lote`} onClick={() => {
                    setAdded((items) => items.filter((item) => item.studentId !== participant.studentId));
                    setDirty(true);
                    setAdditionMessage(`${participant.studentName} retirado del lote sin guardar.`);
                  }} className="inline-flex min-h-11 items-center gap-1 rounded-lg px-2 text-xs text-muted-foreground hover:bg-surface-raised">
                    <X aria-hidden="true" className="h-4 w-4" /> Quitar
                  </button> : null}
                </div>
              ) : null}
            </div>
            <label className="flex flex-col gap-1 text-xs text-muted-foreground">
              Estado
              <select
                name="status"
                disabled={pending}
                value={values[participant.studentId]?.status ?? participant.currentStatus ?? "present"}
                onChange={(event) => {
                  const status = event.target.value as AttendanceStatus;
                  setValues((current) => ({ ...current, [participant.studentId]: { status, note: current[participant.studentId]?.note ?? participant.note ?? "" } }));
                  setDirty(true);
                }}
                className="h-11 rounded-lg border border-input bg-background px-3 text-sm text-foreground"
              >
                <option value="present">Presente</option>
                <option value="late">Tarde</option>
                <option value="absent">Ausente</option>
                <option value="excused">Justificado</option>
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs text-muted-foreground">
              Novedad
              <input
                name="note"
                disabled={pending}
                value={values[participant.studentId]?.note ?? participant.note ?? ""}
                onChange={(event) => {
                  const note = event.target.value;
                  setValues((current) => ({ ...current, [participant.studentId]: { note, status: current[participant.studentId]?.status ?? participant.currentStatus ?? "present" } }));
                  setDirty(true);
                }}
                placeholder="Opcional"
                className="h-11 rounded-lg border border-input bg-background px-3 text-sm text-foreground"
              />
            </label>
          </fieldset>
        ))}
      </div>
      {state.error ? (
        <p role="alert" className="mt-4 text-destructive">
          {state.error}
        </p>
      ) : null}
      {state.saved && !dirty ? (
        <p role="status" className="mt-4 text-primary">
          Asistencia guardada.
        </p>
      ) : null}
      {state.pendingOffline && !dirty ? (
        <p role="status" className="mt-4 text-warning">
          Sin conexión. Asistencia pendiente de sincronización.
        </p>
      ) : null}
      <Button
        type="submit"
        variant="primary"
        isLoading={pending}
        disabled={roster.length === 0}
        className="mt-5 h-11 w-full sm:w-auto"
      >
        {pending ? "Guardando..." : "Guardar asistencia"}
      </Button>
    </form>
    </>
  );
}
