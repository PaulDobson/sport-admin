export interface OperationalReportFilters {
  from: string;
  to: string;
  locationId?: string;
}

export interface OperationalReport {
  from: string;
  to: string;
  locationId?: string;
  activeStudents: number;
  attendance: {
    total: number;
    present: number;
    absent: number;
    late: number;
    excused: number;
  };
  evaluations: number;
  openAlerts: number;
}

export interface OperationalReportRepositoryPort {
  load(
    tenantId: string,
    filters: OperationalReportFilters,
  ): Promise<OperationalReport>;
}
