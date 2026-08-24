import type {
  ClassSchedule,
  ClassTemplate,
  Discipline,
} from "@/domain/instructor-operations/schedule";

export interface CreateScheduleInput {
  tenantId: string;
  classTemplateId: string;
  locationId: string;
  instructorMembershipId: string;
  dayOfWeek: number;
  startsAt: string;
  endsAt: string;
  timezone: string;
  allowConflict: boolean;
}

export interface ScheduleRepositoryPort {
  createDiscipline(input: {
    tenantId: string;
    name: string;
  }): Promise<Discipline>;
  createClassTemplate(input: {
    tenantId: string;
    disciplineId: string;
    name: string;
    capacity: number;
  }): Promise<ClassTemplate>;
  hasConflict(input: CreateScheduleInput): Promise<boolean>;
  createSchedule(input: CreateScheduleInput): Promise<ClassSchedule>;
}
