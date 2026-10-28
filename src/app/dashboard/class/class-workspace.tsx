"use client";

import { useCallback, useState } from "react";
import { Dumbbell, Tags } from "lucide-react";
import type { ClassTemplateAdministrationRow } from "@/application/instructor-operations/ports/class-template-administration-port";
import type { DisciplineOption } from "@/application/instructor-operations/ports/schedule-catalog-port";
import type { ClassTemplateOption } from "@/application/instructor-operations/ports/schedule-catalog-port";
import { Surface } from "@/presentation/components/primitives";
import { ClassTemplateAdministrationWorkspace } from "@/app/dashboard/schedule/class-template-administration-workspace";
import {
  CatalogCreationPanel,
  ClassCreationForm,
  DisciplineCreationForm,
} from "@/app/dashboard/schedule/programming-catalog-forms";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mergeCreated<T extends { id: string }>(catalog: T[], created: T[]) {
  if (created.length === 0) return catalog;
  const existingIds = new Set(catalog.map((item) => item.id));
  const novel = created.filter((item) => !existingIds.has(item.id));
  return novel.length === 0 ? catalog : [...catalog, ...novel];
}

// ---------------------------------------------------------------------------
// ClassWorkspace — client component that owns optimistic state
// ---------------------------------------------------------------------------

export function ClassWorkspace({
  classes,
  disciplines,
}: {
  classes: ClassTemplateAdministrationRow[];
  disciplines: DisciplineOption[];
}) {
  const [createdDisciplines, setCreatedDisciplines] = useState<
    DisciplineOption[]
  >([]);
  const [createdClasses, setCreatedClasses] = useState<ClassTemplateOption[]>(
    [],
  );
  const [classCreationOpen, setClassCreationOpen] = useState(
    classes.length === 0,
  );

  const allDisciplines = mergeCreated(disciplines, createdDisciplines);
  const allClasses = mergeCreated(
    classes,
    createdClasses.map((item) => ({
      ...item,
      scheduleCount: 0,
      sessionCount: 0,
    })),
  );

  const onDisciplineCreated = useCallback(
    (value: DisciplineOption) =>
      setCreatedDisciplines((c) => mergeCreated(c, [value])),
    [],
  );
  const onClassCreated = useCallback(
    (value: ClassTemplateOption) =>
      setCreatedClasses((c) => mergeCreated(c, [value])),
    [],
  );

  return (
    <div className="space-y-4">
      {/* Catalog creation panel */}

      <Surface className="relative overflow-hidden border-primary/15 bg-linear-to-br from-primary/10 via-card to-card p-5 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="max-w-2xl">
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-primary">
              <Dumbbell aria-hidden="true" className="h-4 w-4" /> Catálogo de
              clases
            </p>
            <h1 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
              ¿Que clases impartes?
            </h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Las disciplinas agrupan tus clases. Las clases definen grupos y
              cupos.
            </p>
          </div>
        </div>
      </Surface>

      <Surface className="space-y-4 border-border/80 bg-surface-raised p-4 sm:p-5">
        <CatalogCreationPanel
          title="Nueva disciplina"
          description="Agrupa tus clases por actividad: boxeo, yoga, pilates…"
          icon={Tags}
        >
          <DisciplineCreationForm onCreated={onDisciplineCreated} />
        </CatalogCreationPanel>
        <CatalogCreationPanel
          title="Nueva clase"
          description="Define el grupo y sus cupos; luego asígnale horarios."
          icon={Dumbbell}
          open={classCreationOpen || classes.length === 0}
          onToggle={(e) => setClassCreationOpen(e.currentTarget.open)}
        >
          <ClassCreationForm
            disciplines={allDisciplines}
            onCreated={onClassCreated}
          />
        </CatalogCreationPanel>
      </Surface>

      {/* Classes list with search/edit/delete */}
      <ClassTemplateAdministrationWorkspace classes={allClasses} />
    </div>
  );
}
