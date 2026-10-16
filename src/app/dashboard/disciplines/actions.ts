"use server";

import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { requireOperationalMembership } from "@/app/_lib/operational-context";
import { formatActionError } from "@/app/_lib/format-error";
import { createDiscipline } from "@/application/instructor-operations/use-cases/create-discipline";
import { deleteDiscipline, updateDiscipline } from "@/application/instructor-operations/use-cases/manage-disciplines";
import { UnauthorizedError, ValidationError } from "@/domain/shared/errors";
import { createDisciplineAdministrationDeps } from "@/infrastructure/composition/discipline-administration-composition";

export interface DisciplineActionState {
  error: string | null;
  message: string | null;
}

export async function saveDisciplineAction(
  _previous: DisciplineActionState,
  formData: FormData,
): Promise<DisciplineActionState> {
  try {
    const membership = await requireOperationalMembership();
    if (membership.role === "assistant") {
      throw new UnauthorizedError("Tu perfil solo puede consultar disciplinas.");
    }
    const deps = await createDisciplineAdministrationDeps();
    const operation = formData.get("operation");
    const input = {
      tenantId: membership.tenantId,
      id: String(formData.get("id") ?? ""),
      name: String(formData.get("name") ?? ""),
    };
    let message: string;
    if (operation === "create") {
      await createDiscipline(input, { schedules: deps.disciplines });
      message = "Disciplina creada.";
    } else if (operation === "update") {
      await updateDiscipline({ ...input, status: String(formData.get("status") ?? "") }, deps);
      message = "Disciplina actualizada.";
    } else if (operation === "delete") {
      await deleteDiscipline(input, deps);
      message = "Disciplina eliminada.";
    } else {
      throw new ValidationError([{ path: "operation", message: "La acción solicitada no es válida." }]);
    }
    for (const path of ["/dashboard/disciplines", "/dashboard/schedule", "/dashboard/schedule/programming", "/dashboard"]) {
      revalidatePath(path);
    }
    return { error: null, message };
  } catch (error) {
    unstable_rethrow(error);
    return { error: formatActionError(error), message: null };
  }
}
