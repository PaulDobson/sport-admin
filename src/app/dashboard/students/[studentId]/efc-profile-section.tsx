import { createEfcTrainingDeps } from "@/infrastructure/composition/efc-training-composition";
import type { StudentAdministrationRow } from "@/application/instructor-operations/ports/student-repository-port";
import { EfcProfileForm } from "./efc-profile/efc-profile-form";
import { Activity } from "lucide-react";

interface Props {
  studentId: string;
  tenantId: string;
  student: StudentAdministrationRow;
}

/**
 * EfcProfileSection — Server Component.
 * Fetches EFC profile and test history for a student, then renders the
 * interactive EfcProfileForm client component.
 */
export async function EfcProfileSection({ studentId, tenantId, student }: Props) {
  const efc = await createEfcTrainingDeps();

  const [profile, tests] = await Promise.all([
    efc.profiles.findByAthleteId(studentId, tenantId),
    efc.profiles.findTestsByAthleteId(studentId, tenantId, 50),
  ]);

  return (
    <section aria-labelledby="efc-heading" className="space-y-6">
      <div className="flex items-center gap-3">
        <span
          className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/15 text-amber-400"
          aria-hidden="true"
        >
          <Activity className="h-5 w-5" />
        </span>
        <div>
          <h3 id="efc-heading" className="text-xl font-semibold">
            Perfil EFC
          </h3>
          <p className="text-sm text-muted-foreground">
            Datos fisiológicos y tests físicos para la planificación EFC.
          </p>
        </div>
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
    </section>
  );
}
