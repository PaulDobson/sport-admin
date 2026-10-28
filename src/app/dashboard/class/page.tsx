import { requireOperationalMembership } from "@/app/_lib/operational-context";
import { createInstructorSchedulingDeps } from "@/infrastructure/composition/instructor-scheduling-composition";
import { ClassWorkspace } from "./class-workspace";

export default async function ClassPage() {
  const membership = await requireOperationalMembership();

  const deps = await createInstructorSchedulingDeps();
  const [classes, disciplines] = await Promise.all([
    deps.classes.list(membership.tenantId),
    deps.catalog.listActiveDisciplines(membership.tenantId),
  ]);

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div>
        <h1 className="text-xl font-bold">Clases</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Administra el catálogo de clases y disciplinas de tu gimnasio.
        </p>
      </div>
      <ClassWorkspace classes={classes} disciplines={disciplines} />
    </div>
  );
}
