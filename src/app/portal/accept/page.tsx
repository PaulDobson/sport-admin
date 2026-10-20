import Link from "next/link";
import { redirect } from "next/navigation";
import { createHash } from "node:crypto";
import { createAuthDeps } from "@/infrastructure/composition/auth-composition";
import { createStudentPortalDeps } from "@/infrastructure/composition/student-portal-composition";
import { lookupStudentPortalInvitation } from "@/application/student-portal/use-cases/student-portal";
import { AuthShell } from "@/presentation/components/auth-shell";
import { PortalRegistrationForm } from "./portal-registration-form";
import { RedeemInvitationForm } from "./redeem-invitation-form";

export default async function AcceptPortalInvitePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token = "" } = await searchParams;
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const deps = await createStudentPortalDeps();
  let invitation = null;
  try {
    invitation = await lookupStudentPortalInvitation(tokenHash, {
      portal: deps.portal,
    });
  } catch {
    invitation = null;
  }
  if (!invitation) {
    return (
      <AuthShell
        eyebrow="Invitación"
        title="Este enlace ya no está disponible"
        description="Puede haber vencido o ya haber sido utilizado. Pide una nueva invitación al instructor de tu academia."
        alternatePrompt="¿Ya tienes acceso?"
        alternateLabel="Ingresar"
        alternateHref="/log-in"
      >
        <Link
          href="/log-in"
          className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-primary px-4 text-sm font-bold text-primary-foreground"
        >
          Ir a ingresar
        </Link>
      </AuthShell>
    );
  }

  const auth = await createAuthDeps();
  const userId = await auth.auth.getCurrentUserId();

  return (
    <AuthShell
      eyebrow={invitation.tenantName}
      title={userId ? "Vincula tu ficha" : "Activa tu acceso deportivo"}
      description={`La invitación fue enviada a ${invitation.email}. Podrás consultar y reservar sesiones asociadas a tu ficha.`}
      alternatePrompt={userId ? "¿No eres tú?" : "¿Ya activaste tu cuenta?"}
      alternateLabel={userId ? "Cerrar sesión e ingresar" : "Ingresar"}
      alternateHref={
        userId
          ? `/portal/accept?token=${token}`
          : `/log-in?next=${encodeURIComponent(`/portal/accept?token=${token}`)}`
      }
    >
      {userId ? (
        <RedeemInvitationForm token={token} />
      ) : (
        <PortalRegistrationForm token={token} email={invitation.email} />
      )}
    </AuthShell>
  );
}
