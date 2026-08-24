import type { AttendanceStatus } from "@/domain/evolution-health-attendance/attendance";

export type OfflineCommandStatus =
  | "pending"
  | "syncing"
  | "failed"
  | "conflict";

export interface OfflineAttendanceItem {
  studentId: string;
  status: AttendanceStatus;
  note?: string;
  operationId: string;
}

export interface OfflineAttendanceBatchPayload {
  sessionId: string;
  recordedByMembershipId: string;
  items: OfflineAttendanceItem[];
}

export interface OfflineCommand {
  operationId: string;
  tenantId: string;
  type: "attendance.batch";
  payload: OfflineAttendanceBatchPayload;
  status: OfflineCommandStatus;
  retryCount: number;
  lastError?: string;
  conflict?: {
    entityType: "attendance" | "health";
    entityId: string;
    localVersion: number;
    serverVersion: number;
  };
  createdAt: Date;
  updatedAt: Date;
}
