"use server";

import { createHash } from "node:crypto";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAuthDeps } from "@/infrastructure/composition/auth-composition";
import { createStudentPortalDeps } from "@/infrastructure/composition/student-portal-composition";
import { clearActiveTenantCookie } from "@/infrastructure/composition/tenant-context-composition";
import {
  cancelStudentPortalSession,
  enrollStudentPortalSession,
  redeemStudentPortalInvitation,
} from "@/application/student-portal/use-cases/student-portal";
import { formatActionError } from "@/app/_lib/format-error";

export interface PortalActionState {
  error: string | null;
  success: boolean;
}

function tokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function registerPortalAccountAction(
  _previous: PortalActionState,
  formData: FormData,
): Promise<PortalActionState> {
  const token = String(formData.get("token") ?? "");
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const fullName = String(formData.get("fullName") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const parsed = z
    .object({
      token: z.string().regex(/^[a-f0-9]{64}$/),
      email: z.string().email().max(254),
      fullName: z.string().min(2).max(120),
      password: z.string().min(8).max(128),
    })
    .safeParse({ token, email, fullName, password });
  if (!parsed.success) {
    return {
      error: "Revisa el correo, el nombre y la contraseña ingresados.",
      success: false,
    };
  }
  let redirectToPortal = false;

  try {
    const portal = await createStudentPortalDeps();
    const invite = await portal.portal.lookupInvitation(tokenHash(token));
    if (!invite || invite.email !== email) {
      return {
        error: "La invitación no es válida para este correo o ya venció.",
        success: false,
      };
    }

    const auth = await createAuthDeps();
    await auth.auth.signUp({
      email,
      password,
      fullName,
      emailRedirectTo: `${portal.siteUrl}/auth/callback?next=${encodeURIComponent(`/portal/accept?token=${token}`)}`,
    });
    const userId = await auth.auth.getCurrentUserId();
    if (userId) {
      await redeemStudentPortalInvitation(tokenHash(token), {
        portal: portal.portal,
      });
      redirectToPortal = true;
    }
  } catch (error) {
    return { error: formatActionError(error), success: false };
  }

  if (redirectToPortal) redirect("/portal");
  return { error: null, success: true };
}

export async function redeemPortalInvitationAction(
  _previous: PortalActionState,
  formData: FormData,
): Promise<PortalActionState> {
  const token = String(formData.get("token") ?? "");
  try {
    const auth = await createAuthDeps();
    if (!(await auth.auth.getCurrentUserId())) {
      return {
        error: "Inicia sesión para aceptar esta invitación.",
        success: false,
      };
    }
    const portal = await createStudentPortalDeps();
    await redeemStudentPortalInvitation(tokenHash(token), {
      portal: portal.portal,
    });
  } catch (error) {
    return { error: formatActionError(error), success: false };
  }
  revalidatePath("/portal");
  redirect("/portal");
}

export async function switchAccountForPortalInviteAction(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  if (!/^[a-f0-9]{64}$/.test(token)) redirect("/log-in");
  const auth = await createAuthDeps();
  await auth.auth.signOut();
  await clearActiveTenantCookie();
  redirect(`/portal/accept?token=${token}`);
}

export async function signOutStudentPortalAction() {
  const auth = await createAuthDeps();
  await auth.auth.signOut();
  await clearActiveTenantCookie();
  redirect("/log-in");
}

export async function changePortalEnrollmentAction(
  _previous: PortalActionState,
  formData: FormData,
): Promise<PortalActionState> {
  const operation = String(formData.get("operation") ?? "");
  if (operation !== "enroll" && operation !== "cancel") {
    return { error: "La acción de reserva no es válida.", success: false };
  }
  try {
    const portal = await createStudentPortalDeps();
    const input = {
      tenantId: String(formData.get("tenantId") ?? ""),
      studentId: String(formData.get("studentId") ?? ""),
      sessionId: String(formData.get("sessionId") ?? ""),
    };
    if (operation === "cancel") {
      await cancelStudentPortalSession(input, { portal: portal.portal });
    } else {
      await enrollStudentPortalSession(input, { portal: portal.portal });
    }
  } catch (error) {
    return { error: formatActionError(error), success: false };
  }
  revalidatePath("/portal");
  return { error: null, success: true };
}
