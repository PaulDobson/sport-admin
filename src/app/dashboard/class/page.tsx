import { requireOperationalMembership } from "@/app/_lib/operational-context";
import { createInstructorSchedulingDeps } from "@/infrastructure/composition/instructor-scheduling-composition";
import { ClassWorkspace } from "./class-workspace";
import { PageHeader } from "@/presentation/components/page-header";
import Link from "next/link";
import { Activity } from "lucide-react";

export default async function ClassPage() {
  const membership = await requireOperationalMembership();
  const canManage = membership.role !== "assistant";
  const deps = await createInstructorSchedulingDeps();
  const [classes, disciplines] = await Promise.all([
    deps.classes.list(membership.tenantId),
    deps.catalog.listActiveDisciplines(membership.tenantId),
  ]);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        title="Clases"
        description="Administra el catálogo de clases y disciplinas de tu gimnasio."
      />
      <ClassWorkspace classes={classes} disciplines={disciplines} />
    </div>
  );
}
