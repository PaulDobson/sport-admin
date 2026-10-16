export interface ClassTemplateOption {
  id: string;
  name: string;
  capacity: number;
  disciplineName: string;
}

export interface ClassScheduleOption {
  id: string;
  classTemplateId: string;
  classTemplateName: string;
  locationId: string;
  locationName: string;
  instructorMembershipId: string;
  dayOfWeek: number;
  startsAt: string;
  endsAt: string;
  timezone: string;
}

export interface ScheduleCatalogPort {
  findActiveDiscipline(
    tenantId: string,
    id: string,
  ): Promise<{ id: string } | null>;
  listActiveDisciplines(tenantId: string): Promise<DisciplineOption[]>;
  listActiveTemplates(tenantId: string): Promise<ClassTemplateOption[]>;
  listActiveSchedules(tenantId: string): Promise<ClassScheduleOption[]>;
  listActiveLocations(
    tenantId: string,
  ): Promise<Array<{ id: string; name: string; address?: string | null }>>;
}
export interface DisciplineOption {
  id: string;
  name: string;
}
