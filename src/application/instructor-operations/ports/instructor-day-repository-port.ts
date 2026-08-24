import type {
  DayLocation,
  DaySession,
} from "@/domain/instructor-operations/instructor-day";

export interface InstructorDayRepositoryPort {
  countActiveStudents(tenantId: string): Promise<number>;
  listActiveLocations(tenantId: string): Promise<DayLocation[]>;
  listOpenSessions(input: {
    tenantId: string;
    now: Date;
    locationId?: string;
  }): Promise<DaySession[]>;
}
