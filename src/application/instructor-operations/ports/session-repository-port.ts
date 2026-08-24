import type {
  ClassSession,
  ClassSessionStatus,
  ExpectedParticipant,
  SessionEnrollment,
} from "@/domain/instructor-operations/session";

export interface GenerateSessionInput {
  tenantId: string;
  classScheduleId: string;
  startsAt: Date;
  endsAt: Date;
  waitlistEnabled: boolean;
}

export interface EditSessionInput {
  tenantId: string;
  sessionId: string;
  locationId?: string;
  instructorMembershipId?: string;
  startsAt?: Date;
  endsAt?: Date;
  capacity?: number;
  waitlistEnabled?: boolean;
  status?: ClassSessionStatus;
}

export interface SessionRepositoryPort {
  generate(input: GenerateSessionInput): Promise<ClassSession>;
  update(input: EditSessionInput): Promise<ClassSession>;
  enroll(input: {
    tenantId: string;
    sessionId: string;
    studentId: string;
  }): Promise<SessionEnrollment>;
  cancelEnrollment(input: {
    tenantId: string;
    sessionId: string;
    studentId: string;
  }): Promise<SessionEnrollment>;
  listExpectedParticipants(
    tenantId: string,
    sessionId: string,
  ): Promise<ExpectedParticipant[]>;
}
