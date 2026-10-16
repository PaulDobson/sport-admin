import type { DayLocation, DaySession } from "@/domain/instructor-operations/instructor-day";
import type { ClassSessionStatus } from "@/domain/instructor-operations/session";

export interface ScheduleSessionFilters {
  tenantId: string;
  locationId?: string;
  query?: string;
  disciplineId?: string;
  status: ClassSessionStatus | "all";
  startsOnOrAfter?: Date;
  startsBefore?: Date;
  page: number;
  pageSize: number;
}

export interface ScheduleSessionPage {
  locations: DayLocation[];
  disciplines: DayLocation[];
  sessions: DaySession[];
  total: number;
}

export interface ScheduleSessionRepositoryPort {
  findById(
    tenantId: string,
    sessionId: string,
  ): Promise<Pick<DaySession, "id" | "name" | "locationName" | "startsAt" | "endsAt"> | null>;
  listPage(filters: ScheduleSessionFilters): Promise<ScheduleSessionPage>;
}
