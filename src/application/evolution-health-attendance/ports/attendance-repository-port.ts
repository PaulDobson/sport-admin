import type {
  AttendanceParticipant,
  AttendanceRecord,
  AttendanceStatus,
} from "@/domain/evolution-health-attendance/attendance";

export interface AttendanceBatchItem {
  studentId: string;
  status: AttendanceStatus;
  note?: string;
  operationId: string;
}

export interface StudentAttendanceRecord {
  sessionId: string;
  className: string;
  locationName: string;
  startsAt: Date;
  endsAt: Date;
  status: AttendanceStatus;
  note?: string;
  recordedAt: Date;
}

export interface StudentAttendanceMonthSummary {
  year: number;
  month: number; // 1–12
  present: number;
  late: number;
  absent: number;
  excused: number;
  total: number;
}

export interface AttendanceRepositoryPort {
  listExpectedParticipants(
    tenantId: string,
    sessionId: string,
  ): Promise<AttendanceParticipant[]>;
  /** Full record list — use only when total is small (< ~50). */
  listStudentHistory(
    tenantId: string,
    studentId: string,
  ): Promise<StudentAttendanceRecord[]>;
  /** Aggregated monthly summaries — cheap even with years of data. */
  listStudentMonthlySummary(
    tenantId: string,
    studentId: string,
  ): Promise<StudentAttendanceMonthSummary[]>;
  /** Records for a single month (year/month are 1-indexed). */
  listStudentMonthDetail(
    tenantId: string,
    studentId: string,
    year: number,
    month: number,
  ): Promise<StudentAttendanceRecord[]>;
  saveBatch(input: {
    tenantId: string;
    sessionId: string;
    recordedByMembershipId: string;
    items: AttendanceBatchItem[];
  }): Promise<AttendanceRecord[]>;
}
