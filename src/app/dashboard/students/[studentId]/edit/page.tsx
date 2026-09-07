import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createAuthDeps } from "@/infrastructure/composition/auth-composition";
import { createInstructorOperationsDeps } from "@/infrastructure/composition/instructor-operations-composition";
import { requireOperationalMembership } from "@/app/_lib/operational-context";
import { AccountContextMenu } from "@/presentation/components/account-context-menu";
import { AppShell, ProductMark } from "@/presentation/components/app-shell";
import {
  DesktopNavigation,
  MobileNavigation,
} from "@/presentation/components/primary-navigation";
import { QuickActionMenu } from "@/presentation/components/quick-action-menu";
import { Surface } from "@/presentation/components/primitives";
import { StudentEditForm } from "./student-edit-form";

function roleLabelFor(role: string) {
  return role === "owner"
    ? "Dueño"
    : role === "assistant"
      ? "Asistente"
      : role === "admin"
        ? "Administrador"
        : role;
}

export default async function StudentEditPage({
  params,
}: {
  params: Promise<{ studentId: string }>;
}) {
  const membership = await requireOperationalMembership();
  if (membership.role === "assistant") redirect("/dashboard/students");
  const { studentId } = await params;
  const auth = await createAuthDeps();
  const userId = await auth.auth.getCurrentUserId();
  if (!userId) redirect("/log-in");
  const operations = await createInstructorOperationsDeps();
  const [student, profile, tenants] = await Promise.all([
    operations.students.findAdministrationRowById(
      membership.tenantId,
      studentId,
    ),
    auth.profiles.findByUserId(userId),
    auth.tenants.findOperationalByUser(userId),
  ]);
  if (!student) notFound();

  const roleLabel = roleLabelFor(membership.role);
  const academyName =
    tenants.find((tenant) => tenant.id === membership.tenantId)?.name ??
    "Academia activa";

  return (
    <AppShell
      sidebarHeader={<ProductMark context={roleLabel} />}
      navigation={<DesktopNavigation role={membership.role} />}
      mobileNavigation={
        <MobileNavigation
          role={membership.role}
          quickAction={<QuickActionMenu role={membership.role} />}
        />
      }
      topbar={
        <div>
          <p className="mb-1 text-xs font-medium uppercase tracking-[0.2em] text-primary">
            Academia
          </p>
          <h1 className="text-xl font-semibold sm:text-2xl">{academyName}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Editar alumno · {roleLabel}
          </p>
        </div>
      }
      topbarActions={
        <AccountContextMenu
          profileName={profile?.fullName || "Tu cuenta"}
          currentTenantId={membership.tenantId}
          roleLabel={roleLabel}
          tenants={tenants.map((tenant) => ({
            id: tenant.id,
            name: tenant.name,
          }))}
        />
      }
    >
      <div className="mx-auto max-w-3xl">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
              Datos básicos
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">
              {student.fullName}
            </h2>
          </div>
          <Link
            href="/dashboard/students"
            className="text-sm font-semibold text-primary"
          >
            Volver
          </Link>
        </div>
        <StudentEditForm
          student={{
            id: student.id,
            fullName: student.fullName,
            birthDate: student.birthDate,
            primaryContact: student.primaryContact
              ? {
                  type: student.primaryContact.type,
                  value: student.primaryContact.value,
                }
              : null,
          }}
        />
      </div>
    </AppShell>
  );
}
