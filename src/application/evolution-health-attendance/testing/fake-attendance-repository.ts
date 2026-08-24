import type {
  AttendanceParticipant,
  AttendanceRecord,
} from "@/domain/evolution-health-attendance/attendance";
import type { AttendanceRepositoryPort } from "../ports/attendance-repository-port";

export class FakeAttendanceRepository implements AttendanceRepositoryPort {
  readonly participants: Array<
    AttendanceParticipant & { tenantId: string; sessionId: string }
  > = [];
  readonly records: AttendanceRecord[] = [];
  saveCalls = 0;

  async listExpectedParticipants(tenantId: string, sessionId: string) {
    return this.participants.filter(
      (participant) =>
        participant.tenantId === tenantId &&
        participant.sessionId === sessionId,
    );
  }

  async saveBatch(input: Parameters<AttendanceRepositoryPort["saveBatch"]>[0]) {
    this.saveCalls += 1;
    return input.items.map((item, index) => {
      const existing = this.records.find(
        (record) =>
          record.tenantId === input.tenantId &&
          (record.operationId === item.operationId ||
            (record.sessionId === input.sessionId &&
              record.studentId === item.studentId)),
      );
      if (existing) {
        Object.assign(existing, item, { updatedAt: new Date() });
        return existing;
      }
      const now = new Date();
      const record: AttendanceRecord = {
        ...item,
        id: `attendance-${index + 1}`,
        tenantId: input.tenantId,
        sessionId: input.sessionId,
        recordedByMembershipId: input.recordedByMembershipId,
        recordedAt: now,
        updatedAt: now,
      };
      this.records.push(record);
      return record;
    });
  }
}
