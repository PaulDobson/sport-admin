export type AttendanceStatus = "present" | "absent" | "late" | "excused";

export interface AttendanceParticipant {
  studentId: string;
  studentName: string;
  currentStatus?: AttendanceStatus;
  note?: string;
}

export interface AttendanceRecord {
  id: string;
  tenantId: string;
  sessionId: string;
  studentId: string;
  recordedByMembershipId: string;
  status: AttendanceStatus;
  note?: string;
  operationId: string;
  recordedAt: Date;
  updatedAt: Date;
}
