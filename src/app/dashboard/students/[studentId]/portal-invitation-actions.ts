"use server";

import { createHash, randomBytes } from "node:crypto";
import { requireOperationalMembership } from "@/app/_lib/operational-context";
import { createStudentPortalInvitation } from "@/application/student-portal/use-cases/student-portal";
import { createStudentPortalDeps } from "@/infrastructure/composition/student-portal-composition";
import { formatActionError } from "@/app/_lib/format-error";

export interface StudentPortalInviteState {
  error: string | null;
  inviteUrl: string | null;
  email: string | null;
  expiresAt: string | null;
}

function invitationErrorMessage(error: unknown) {
  const message =
    error && typeof error === "object" && "message" in error
      ? String(error.message)
      : "";
  if (message.includes("student has no active primary email")) {
    return "Registra un correo electrónico principal activo en la ficha antes de invitar.";
  }
  return formatActionError(error);
}

export async function createStudentPortalInviteAction(
  _previous: StudentPortalInviteState,
  formData: FormData,
): Promise<StudentPortalInviteState> {
  try {
    const membership = await requireOperationalMembership();
    if (membership.role === "assistant") {
      return {
        error: "No tienes permiso para invitar cuentas de alumnos.",
        inviteUrl: null,
        email: null,
        expiresAt: null,
      };
    }

    const studentId = String(formData.get("studentId") ?? "");
    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const deps = await createStudentPortalDeps();
    const invitation = await createStudentPortalInvitation(
      {
        tenantId: membership.tenantId,
        studentId,
        tokenHash: createHash("sha256").update(token).digest("hex"),
        expiresAt,
      },
      deps,
    );

    return {
      error: null,
      inviteUrl: `${deps.siteUrl}/portal/accept?token=${token}`,
      email: invitation.email,
      expiresAt: invitation.expiresAt.toLocaleDateString("es-CL"),
    };
  } catch (error) {
    return {
      error: invitationErrorMessage(error),
      inviteUrl: null,
      email: null,
      expiresAt: null,
    };
  }
}
