"use server";

import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { requireOperationalMembership } from "@/app/_lib/operational-context";
import { editClassSession } from "@/application/instructor-operations/use-cases/edit-class-session";
import { parseOperationalLocalDateTime } from "@/application/instructor-operations/use-cases/session-local-time";
import {
  BusinessRuleViolationError,
  UnauthorizedError,
} from "@/domain/shared/errors";
import { formatActionError } from "@/app/_lib/format-error";
import { createInstructorSessionDeps } from "@/infrastructure/composition/instructor-session-composition";

export interface SessionActionState {
  error: string | null;
  message: string | null;
}

function failure(error: unknown): SessionActionState {
  unstable_rethrow(error);
  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    error.code === "23514" &&
    "message" in error &&
    String(error.message).toLowerCase().includes("capacity")
  ) {
    return {
      error: "Los cupos no pueden ser inferiores a los alumnos confirmados.",
      message: null,
    };
  }
  return { error: formatActionError(error), message: null };
}

export async function maintainSessionAction(
  _previous: SessionActionState,
  formData: FormData,
): Promise<SessionActionState> {
  try {
    const membership = await requireOperationalMembership();
    if (membership.role === "assistant") {
      throw new UnauthorizedError("Tu perfil no puede modificar la programación.");
    }

    const operation = formData.get("operation");
    if (
      operation !== "update" &&
      operation !== "cancel" &&
      operation !== "reactivate"
    ) {
      throw new UnauthorizedError("La acción solicitada no está disponible.");
    }

    const deps = await createInstructorSessionDeps();
    const sessionId = String(formData.get("sessionId") ?? "");
    if (operation === "cancel" || operation === "reactivate") {
      await editClassSession(
        {
          tenantId: membership.tenantId,
          sessionId,
          status: operation === "cancel" ? "cancelled" : "scheduled",
        },
        deps,
      );
    } else {
      const startsAt = parseOperationalLocalDateTime(
        String(formData.get("startsAtLocal") ?? ""),
      );
      const endsAt = parseOperationalLocalDateTime(
        String(formData.get("endsAtLocal") ?? ""),
      );
      if (endsAt <= startsAt) {
        throw new BusinessRuleViolationError(
          "La hora de término debe ser posterior al inicio.",
        );
      }
      const capacity = Number(formData.get("capacity"));
      if (!Number.isInteger(capacity) || capacity < 1 || capacity > 500) {
        throw new BusinessRuleViolationError(
          "Los cupos deben ser un número entero entre 1 y 500.",
        );
      }
      await editClassSession(
        {
          tenantId: membership.tenantId,
          sessionId,
          startsAt,
          endsAt,
          capacity,
        },
        deps,
      );
    }

    revalidatePath("/dashboard", "layout");
    revalidatePath("/portal", "layout");
    return {
      error: null,
      message:
        operation === "cancel"
          ? "Sesión cancelada. El registro y las reservas se conservaron."
          : operation === "reactivate"
            ? "Sesión reactivada."
            : "Cambios de la sesión guardados.",
    };
  } catch (error) {
    return failure(error);
  }
}
