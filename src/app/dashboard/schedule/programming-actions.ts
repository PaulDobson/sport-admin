"use server";

import { revalidatePath } from "next/cache";
import { requireOperationalMembership } from "@/app/_lib/operational-context";
import { createClassSchedule } from "@/application/instructor-operations/use-cases/create-class-schedule";
import { createClassTemplate } from "@/application/instructor-operations/use-cases/create-class-template";
import { createLocation } from "@/application/instructor-operations/use-cases/create-location";
import { archiveLocation } from "@/application/instructor-operations/use-cases/archive-location";
import { updateLocation } from "@/application/instructor-operations/use-cases/update-location";
import {
  createOneOffSession,
  publishRecurringSessions,
} from "@/application/instructor-operations/use-cases/publish-sessions";
import { createInstructorSchedulingDeps } from "@/infrastructure/composition/instructor-scheduling-composition";
import { formatActionError } from "@/app/_lib/format-error";
import { unstable_rethrow } from "next/navigation";
import { UnauthorizedError } from "@/domain/shared/errors";
import {
  deleteClassTemplate,
  updateClassTemplate,
} from "@/application/instructor-operations/use-cases/manage-class-templates";
import { createDiscipline } from "@/application/instructor-operations/use-cases/create-discipline";
import { executeProgrammingBatch } from "@/application/instructor-operations/use-cases/programming-batch";
import type { ProgrammingPreview } from "@/application/instructor-operations/ports/programming-batch-port";

export interface ProgrammingActionState {
  error: string | null;
  message: string | null;
  created?: { id: string; name: string };
  preview?: ProgrammingPreview;
}

function failure(error: unknown): ProgrammingActionState {
  unstable_rethrow(error);
  const message =
    error && typeof error === "object" && "message" in error
      ? String(error.message)
      : "";
  if (message.includes("Schedule conflict requires explicit confirmation")) {
    return {
      error: "Hay un horario que se cruza para este instructor.",
      message: null,
    };
  }
  return { error: formatActionError(error), message: null };
}

async function requireScheduler() {
  const membership = await requireOperationalMembership();
  if (membership.role === "assistant") {
    throw new UnauthorizedError(
      "Tu perfil no puede modificar la programación.",
    );
  }
  return membership;
}

export async function saveClassTemplateAction(
  _previous: ProgrammingActionState,
  formData: FormData,
): Promise<ProgrammingActionState> {
  try {
    const membership = await requireScheduler();
    const operation = formData.get("operation");
    if (operation !== "update" && operation !== "delete") {
      throw new UnauthorizedError("La acción solicitada no está disponible.");
    }
    const deps = await createInstructorSchedulingDeps();
    const identity = {
      tenantId: membership.tenantId,
      id: String(formData.get("id") ?? ""),
    };
    if (operation === "delete") {
      await deleteClassTemplate(identity, { classes: deps.classes });
    } else {
      await updateClassTemplate(
        {
          ...identity,
          name: String(formData.get("className") ?? ""),
          capacity: Number(formData.get("capacity")),
        },
        { classes: deps.classes },
      );
    }
    revalidatePath("/dashboard", "layout");
    revalidatePath("/dashboard/disciplines");
    revalidatePath("/portal", "layout");
    return {
      error: null,
      message:
        operation === "delete"
          ? "Clase eliminada."
          : "Cambios guardados. Las sesiones ya publicadas conservan sus cupos.",
    };
  } catch (error) {
    return failure(error);
  }
}

export async function createClassTemplateAction(
  _previous: ProgrammingActionState,
  formData: FormData,
): Promise<ProgrammingActionState> {
  try {
    const membership = await requireScheduler();
    const disciplineId = String(formData.get("disciplineId") ?? "");
    const name = String(formData.get("className") ?? "").trim();
    const capacity = Number(formData.get("capacity"));
    const deps = await createInstructorSchedulingDeps();
    const created = await createClassTemplate(
      {
        tenantId: membership.tenantId,
        disciplineId,
        name,
        capacity,
      },
      { schedules: deps.schedules, catalog: deps.catalog },
    );
    revalidatePath("/dashboard/schedule/programming");
    revalidatePath("/dashboard/disciplines");
    return {
      error: null,
      message: "Plantilla de clase creada.",
      created: { id: created.id, name: created.name },
    };
  } catch (error) {
    return failure(error);
  }
}

export async function createLocationAction(
  _previous: ProgrammingActionState,
  formData: FormData,
): Promise<ProgrammingActionState> {
  try {
    const membership = await requireScheduler();
    const deps = await createInstructorSchedulingDeps();
    const created = await createLocation(
      {
        tenantId: membership.tenantId,
        name: String(formData.get("name") ?? "").trim(),
        type: String(formData.get("type") ?? "external_gym") as
          | "external_gym"
          | "park"
          | "home"
          | "online",
        address: String(formData.get("address") ?? "").trim() || null,
      },
      { locations: deps.locations },
    );
    revalidatePath("/dashboard/schedule/programming");
    revalidatePath("/dashboard/schedule");
    return {
      error: null,
      message: "Ubicación creada.",
      created: { id: created.id, name: created.name },
    };
  } catch (error) {
    return failure(error);
  }
}

export async function saveLocationAction(
  _previous: ProgrammingActionState,
  formData: FormData,
): Promise<ProgrammingActionState> {
  try {
    const membership = await requireScheduler();
    const operation = formData.get("operation");
    if (operation !== "update" && operation !== "archive") {
      throw new UnauthorizedError("La acción solicitada no está disponible.");
    }
    const deps = await createInstructorSchedulingDeps();
    const id = String(formData.get("id") ?? "");
    if (operation === "archive") {
      await archiveLocation(
        { tenantId: membership.tenantId, locationId: id },
        { locations: deps.locations },
      );
    } else {
      await updateLocation(
        {
          tenantId: membership.tenantId,
          id,
          name: String(formData.get("name") ?? "").trim(),
          type: String(formData.get("type") ?? "external_gym") as
            | "external_gym"
            | "park"
            | "home"
            | "online",
          address: String(formData.get("address") ?? "").trim() || null,
        },
        { locations: deps.locations },
      );
    }
    revalidatePath("/dashboard/schedule/programming");
    revalidatePath("/dashboard/schedule");
    return {
      error: null,
      message:
        operation === "archive" ? "Ubicación archivada." : "Cambios guardados.",
    };
  } catch (error) {
    return failure(error);
  }
}

export async function createRecurringScheduleAction(
  _previous: ProgrammingActionState,
  formData: FormData,
): Promise<ProgrammingActionState> {
  try {
    const membership = await requireScheduler();
    const deps = await createInstructorSchedulingDeps();
    const schedule = await createClassSchedule(
      {
        tenantId: membership.tenantId,
        classTemplateId: String(formData.get("classTemplateId") ?? ""),
        locationId: String(formData.get("locationId") ?? ""),
        instructorMembershipId: membership.id,
        dayOfWeek: Number(formData.get("dayOfWeek")),
        startsAt: String(formData.get("startsAt") ?? ""),
        endsAt: String(formData.get("endsAt") ?? ""),
        timezone: String(formData.get("timezone") ?? "America/Santiago"),
        allowConflict: formData.get("allowConflict") === "on",
      },
      { schedules: deps.schedules },
    );
    revalidatePath("/dashboard/schedule/programming");
    return {
      error: null,
      message: `Horario guardado para ${schedule.startsAt.slice(0, 5)}. Elige un rango para publicarlo.`,
    };
  } catch (error) {
    return failure(error);
  }
}

export async function createOneOffSessionAction(
  _previous: ProgrammingActionState,
  formData: FormData,
): Promise<ProgrammingActionState> {
  try {
    const membership = await requireScheduler();
    const deps = await createInstructorSchedulingDeps();
    await createOneOffSession(
      {
        tenantId: membership.tenantId,
        classTemplateId: String(formData.get("classTemplateId") ?? ""),
        locationId: String(formData.get("locationId") ?? ""),
        instructorMembershipId: membership.id,
        startsAtLocal: String(formData.get("startsAtLocal") ?? ""),
        endsAtLocal: String(formData.get("endsAtLocal") ?? ""),
        timezone: String(formData.get("timezone") ?? "America/Santiago"),
        waitlistEnabled: formData.get("waitlistEnabled") === "on",
      },
      { publishing: deps.publishing },
    );
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/schedule");
    revalidatePath("/dashboard/schedule/programming");
    return { error: null, message: "Sesión única publicada." };
  } catch (error) {
    return failure(error);
  }
}

export async function publishRecurringSessionsAction(
  _previous: ProgrammingActionState,
  formData: FormData,
): Promise<ProgrammingActionState> {
  try {
    const membership = await requireScheduler();
    const deps = await createInstructorSchedulingDeps();
    const count = await publishRecurringSessions(
      {
        tenantId: membership.tenantId,
        classScheduleId: String(formData.get("classScheduleId") ?? ""),
        fromDate: String(formData.get("fromDate") ?? ""),
        throughDate: String(formData.get("throughDate") ?? ""),
        waitlistEnabled: formData.get("waitlistEnabled") === "on",
      },
      { publishing: deps.publishing },
    );
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/schedule");
    revalidatePath("/dashboard/schedule/programming");
    return {
      error: null,
      message: `${count} sesiones nuevas publicadas. Las sesiones existentes conservan sus cambios.`,
    };
  } catch (error) {
    return failure(error);
  }
}

export async function createDisciplineAction(
  _previous: ProgrammingActionState,
  formData: FormData,
): Promise<ProgrammingActionState> {
  try {
    const membership = await requireScheduler();
    const deps = await createInstructorSchedulingDeps();
    const created = await createDiscipline(
      {
        tenantId: membership.tenantId,
        name: String(
          formData.get("name") ?? formData.get("disciplineName") ?? "",
        ).trim(),
      },
      { schedules: deps.schedules },
    );
    revalidatePath("/dashboard/schedule/programming");
    revalidatePath("/dashboard/disciplines");
    return {
      error: null,
      message: "Disciplina creada.",
      created: { id: created.id, name: created.name },
    };
  } catch (error) {
    return failure(error);
  }
}

async function programmingAction(
  previous: ProgrammingActionState,
  formData: FormData,
  commit: boolean,
): Promise<ProgrammingActionState> {
  try {
    const membership = await requireScheduler();
    const programming = JSON.parse(String(formData.get("programming") ?? ""));
    const intent = String(formData.get("intent") ?? "publish") as
      | "save"
      | "publish";
    const deps = await createInstructorSchedulingDeps();
    const preview = await executeProgrammingBatch(
      {
        tenantId: membership.tenantId,
        instructorMembershipId:
          programming?.instructorMembershipId ?? membership.id,
        programming,
        intent,
        commit,
        previewFingerprint:
          String(formData.get("previewFingerprint") ?? "") ||
          previous.preview?.fingerprint,
      },
      { programming: deps.programming },
    );
    if (commit) {
      revalidatePath("/dashboard", "layout");
      revalidatePath("/portal", "layout");
    }
    return {
      error: null,
      message: !commit
        ? null
        : intent === "save"
          ? "Horarios guardados sin publicar sesiones."
          : `${preview.newCount} sesiones nuevas publicadas; ${preview.existingCount} existentes conservadas.`,
      preview,
    };
  } catch (error) {
    if (error instanceof SyntaxError)
      return { error: "La programación no es válida.", message: null };
    return failure(error);
  }
}

export async function previewProgrammingAction(
  previous: ProgrammingActionState,
  formData: FormData,
): Promise<ProgrammingActionState> {
  return programmingAction(previous, formData, false);
}

export async function saveProgrammingAction(
  previous: ProgrammingActionState,
  formData: FormData,
): Promise<ProgrammingActionState> {
  return programmingAction(previous, formData, true);
}
