export type OperationalStatus = "active" | "archived";

export interface Discipline {
  id: string;
  tenantId: string;
  name: string;
  status: OperationalStatus;
  createdAt: Date;
}

export interface ClassTemplate {
  id: string;
  tenantId: string;
  disciplineId: string;
  name: string;
  capacity: number;
  status: OperationalStatus;
  createdAt: Date;
}

export interface ClassSchedule {
  id: string;
  tenantId: string;
  classTemplateId: string;
  locationId: string;
  instructorMembershipId: string;
  dayOfWeek: number;
  startsAt: string;
  endsAt: string;
  timezone: string;
  allowConflict: boolean;
  status: OperationalStatus;
  createdAt: Date;
}
