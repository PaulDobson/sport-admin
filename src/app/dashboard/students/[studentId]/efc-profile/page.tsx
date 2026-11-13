import { Activity } from "lucide-react";
import { requireOperationalMembership } from "@/app/_lib/operational-context";
import { createEfcTrainingDeps } from "@/infrastructure/composition/efc-training-composition";
import { createInstructorOperationsDeps } from "@/infrastructure/composition/instructor-operations-composition";
import { EfcProfileForm } from "./efc-profile-form";

interface Props {
  params: Promise<{ studentId: string }>;
}

export default async function EfcProfilePage({ params }: Props) {
  const membership = await requireOperationalMembership();
  const { studentId } = await params;

  const [ops, efc] = await Promise.all([
    createInstructorOperationsDeps(),
    createEfcTrainingDeps(),
  ]);

  const [student, profile, tests] = await Promise.all([
    ops.students.findAdministrationRowById(membership.tenantId, studentId),
    efc.profiles.findByAthleteId(studentId, membership.tenantId),
    efc.profiles.findTestsByAthleteId(studentId, membership.tenantId, 50),
  ]);

  if (!student) {
    return (
      <div className="rounded-xl border border-border bg-card px-6 py-10 text-center">
        <p className="text-sm text-muted-foreground">
          Deportista no encontrado.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/15 text-amber-400">
          <Activity className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <h2 className="text-lg font-semibold">Perfil EFC</h2>
          <p className="text-sm text-muted-foreground">
            Datos fisiológicos y tests físicos para la planificación EFC.
          </p>
        </div>
      </header>

      {/* ── Export button ────────────────────────────────────────────────── */}
      <div className="flex justify-end">
        <a
          href={`/api/efc/export-athlete?athleteId=${studentId}`}
          download
          className="inline-flex h-9 items-center gap-2 rounded-lg border border-border px-4 text-sm font-medium text-muted-foreground transition-colors hover:bg-surface-raised hover:text-foreground focus-visible:outline-2 focus-visible:outline-primary"
          aria-label="Exportar ficha EFC a Excel"
        >
          Exportar a Excel
        </a>
      </div>

      <EfcProfileForm
        athleteId={studentId}
        profile={profile}
        student={{
          weightKg: student.weightKg,
          heightCm: student.heightCm,
          birthDate: student.birthDate,
          gender: student.gender as "male" | "female" | null,
        }}
        tests={tests}
      />
    </div>
  );
}
