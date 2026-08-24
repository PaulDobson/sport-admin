import type {
  ClassSchedule,
  ClassTemplate,
  Discipline,
} from "@/domain/instructor-operations/schedule";
import type {
  CreateScheduleInput,
  ScheduleRepositoryPort,
} from "../ports/schedule-repository-port";

export class FakeScheduleRepository implements ScheduleRepositoryPort {
  readonly disciplines: Discipline[] = [];
  readonly templates: ClassTemplate[] = [];
  readonly schedules: ClassSchedule[] = [];

  async createDiscipline(input: { tenantId: string; name: string }) {
    const discipline: Discipline = {
      ...input,
      id: `discipline-${this.disciplines.length + 1}`,
      status: "active",
      createdAt: new Date(),
    };
    this.disciplines.push(discipline);
    return discipline;
  }

  async createClassTemplate(
    input: Parameters<ScheduleRepositoryPort["createClassTemplate"]>[0],
  ) {
    const template: ClassTemplate = {
      ...input,
      id: `template-${this.templates.length + 1}`,
      status: "active",
      createdAt: new Date(),
    };
    this.templates.push(template);
    return template;
  }

  async hasConflict(input: CreateScheduleInput): Promise<boolean> {
    return this.schedules.some(
      (schedule) =>
        schedule.tenantId === input.tenantId &&
        schedule.instructorMembershipId === input.instructorMembershipId &&
        schedule.dayOfWeek === input.dayOfWeek &&
        schedule.status === "active" &&
        schedule.startsAt < input.endsAt &&
        input.startsAt < schedule.endsAt,
    );
  }

  async createSchedule(input: CreateScheduleInput) {
    const schedule: ClassSchedule = {
      ...input,
      id: `schedule-${this.schedules.length + 1}`,
      status: "active",
      createdAt: new Date(),
    };
    this.schedules.push(schedule);
    return schedule;
  }
}
