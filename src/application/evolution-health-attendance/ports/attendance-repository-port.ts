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

export interface AttendanceRepositoryPort {
  listExpectedParticipants(
    tenantId: string,
    sessionId: string,
  ): Promise<AttendanceParticipant[]>;
  saveBatch(input: {
    tenantId: string;
    sessionId: string;
    recordedByMembershipId: string;
    items: AttendanceBatchItem[];
  }): Promise<AttendanceRecord[]>;
}
