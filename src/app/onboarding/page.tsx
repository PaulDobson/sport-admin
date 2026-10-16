import { redirect } from "next/navigation";
import { createAuthDeps } from "@/infrastructure/composition/auth-composition";
import { createStudentPortalDeps } from "@/infrastructure/composition/student-portal-composition";
import {
  hasPendingStudentPortalInvitation,
  listMyStudentPortalStudents,
} from "@/application/student-portal/use-cases/student-portal";
import { OnboardingForm } from "./onboarding-form";

export default async function OnboardingPage() {
  const deps = await createAuthDeps();
  const userId = await deps.auth.getCurrentUserId();
  if (!userId) redirect("/log-in");

  const memberships = await deps.memberships.findActiveByUser(userId);
  if (memberships.length > 0) redirect("/dashboard");
  const portal = await createStudentPortalDeps();
  const [hasPendingInvite, linkedStudents] = await Promise.all([
    hasPendingStudentPortalInvitation({ portal: portal.portal }),
    listMyStudentPortalStudents({ portal: portal.portal }),
  ]);
  if (hasPendingInvite || linkedStudents.length > 0) {
    redirect("/portal");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-4">
      <h1 className="text-2xl font-semibold">Cuentanos sobre tu negocio</h1>
      <OnboardingForm />
    </main>
  );
}
