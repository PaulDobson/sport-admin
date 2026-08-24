"use client";

import { useActionState } from "react";
import Link from "next/link";
import { enqueueOfflineCommand } from "@/application/synchronization/use-cases/enqueue-offline-command";
import type { AttendanceParticipant } from "@/domain/evolution-health-attendance/attendance";
import type { AttendanceStatus } from "@/domain/evolution-health-attendance/attendance";
import { createOfflineStore } from "@/infrastructure/composition/synchronization-composition";
import { saveAttendanceAction, type AttendanceFormState } from "./actions";

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
  async function submitAttendance(
    previousState: OfflineAttendanceFormState,
    formData: FormData,
  ): Promise<OfflineAttendanceFormState> {
    if (navigator.onLine) {
      const result = await saveAttendanceAction(previousState, formData);
      return { ...result, pendingOffline: false };
    }

    const studentIds = formData.getAll("studentId").map(String);
    const statuses = formData.getAll("status").map(String);
    const notes = formData.getAll("note").map(String);
    const itemOperationIds = formData.getAll("operationId").map(String);
    const offlineStore = createOfflineStore();
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
    await offlineStore.close();
    return { error: null, saved: false, pendingOffline: true };
  }

  const [state, formAction, pending] = useActionState(
    submitAttendance,
    initialState,
  );

  return (
    <form action={formAction}>
      <input type="hidden" name="sessionId" value={sessionId} />
      <div className="divide-y divide-border border-y border-border">
        {participants.map((participant, index) => (
          <fieldset
            key={participant.studentId}
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
              value={operationIds[index]}
            />
            <Link
              href={`/dashboard/students/${participant.studentId}`}
              className="font-semibold text-foreground"
            >
              {participant.studentName}
            </Link>
            <label className="flex flex-col gap-1 text-xs text-muted-foreground">
              Estado
              <select
                name="status"
                defaultValue={participant.currentStatus ?? "present"}
                className="h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground"
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
                defaultValue={participant.note}
                placeholder="Opcional"
                className="h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground"
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
      {state.saved ? (
        <p role="status" className="mt-4 text-primary">
          Asistencia guardada.
        </p>
      ) : null}
      {state.pendingOffline ? (
        <p role="status" className="mt-4 text-warning">
          Sin conexión. Asistencia pendiente de sincronización.
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending || participants.length === 0}
        className="mt-5 h-11 w-full rounded-md bg-primary px-4 font-semibold text-primary-foreground disabled:opacity-60 sm:w-auto"
      >
        {pending ? "Guardando..." : "Guardar asistencia"}
      </button>
    </form>
  );
}
