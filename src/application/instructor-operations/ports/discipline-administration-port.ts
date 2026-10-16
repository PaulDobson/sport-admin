import type { Discipline, OperationalStatus } from "@/domain/instructor-operations/schedule";
import type { ScheduleRepositoryPort } from "./schedule-repository-port";

export interface DisciplineListInput {
  tenantId: string;
  page: number;
  pageSize: number;
  search: string;
  status: OperationalStatus | "all";
}

export interface DisciplineAdministrationRow {
  id: string;
  name: string;
  status: OperationalStatus;
  createdAt: string;
  templateCount: number;
}

export interface DisciplineList {
  rows: DisciplineAdministrationRow[];
  total: number;
  page: number;
  pageSize: number;
  activeCount: number;
  archivedCount: number;
}

export interface DisciplineAdministrationPort
  extends Pick<ScheduleRepositoryPort, "createDiscipline"> {
  list(input: DisciplineListInput): Promise<DisciplineList>;
  update(input: {
    tenantId: string;
    id: string;
    name: string;
    status: OperationalStatus;
  }): Promise<Discipline>;
  delete(input: { tenantId: string; id: string }): Promise<void>;
}
