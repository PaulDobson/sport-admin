"use client";

import { useCallback, useState } from "react";
import type {
  ClassTemplateOption,
  DisciplineOption,
} from "@/application/instructor-operations/ports/schedule-catalog-port";
import type { DayLocation } from "@/domain/instructor-operations/instructor-day";
import { ProgrammingWizard } from "./programming-wizard";

function mergeCreated<T extends { id: string }>(catalog: T[], created: T[]) {
  if (created.length === 0) return catalog;
  const existingIds = new Set(catalog.map((item) => item.id));
  const novel = created.filter((item) => !existingIds.has(item.id));
  return novel.length === 0 ? catalog : [...catalog, ...novel];
}

export function ProgrammingWorkspace({
  disciplines,
  templates,
  locations,
  today,
  throughDate,
}: {
  disciplines: DisciplineOption[];
  templates: ClassTemplateOption[];
  locations: DayLocation[];
  today: string;
  throughDate: string;
}) {
  const [createdDisciplines, setCreatedDisciplines] = useState<
    DisciplineOption[]
  >([]);
  const [createdClasses, setCreatedClasses] = useState<ClassTemplateOption[]>(
    [],
  );
  const [createdLocations, setCreatedLocations] = useState<DayLocation[]>([]);
  const [wizardKey, setWizardKey] = useState(0);

  const allDisciplines = mergeCreated(disciplines, createdDisciplines);
  const allTemplates = mergeCreated(templates, createdClasses);
  const allLocations = mergeCreated(locations, createdLocations);

  const onDisciplineCreated = useCallback(
    (value: DisciplineOption) =>
      setCreatedDisciplines((current) => mergeCreated(current, [value])),
    [],
  );
  const onClassCreated = useCallback(
    (value: ClassTemplateOption) =>
      setCreatedClasses((current) => mergeCreated(current, [value])),
    [],
  );
  const onLocationCreated = useCallback(
    (value: DayLocation) =>
      setCreatedLocations((current) => mergeCreated(current, [value])),
    [],
  );

  return (
    <ProgrammingWizard
      key={wizardKey}
      disciplines={allDisciplines}
      templates={allTemplates}
      locations={allLocations}
      today={today}
      throughDate={throughDate}
      onDisciplineCreated={onDisciplineCreated}
      onClassCreated={onClassCreated}
      onLocationCreated={onLocationCreated}
      onDirtyChange={() => setWizardKey((k) => k)}
    />
  );
}
