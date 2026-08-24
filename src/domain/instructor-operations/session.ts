export type ClassSessionStatus = "scheduled" | "cancelled" | "completed";
export type SessionEnrollmentStatus = "confirmed" | "waitlisted" | "cancelled";

export interface ClassSession {
  id: string;
  tenantId: string;
  classScheduleId: string;
  classTemplateId: string;
  locationId: string;
  instructorMembershipId: string;
  startsAt: Date;
  endsAt: Date;
  timezone: string;
  capacity: number;
  waitlistEnabled: boolean;
  status: ClassSessionStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface SessionEnrollment {
  id: string;
  tenantId: string;
  sessionId: string;
  studentId: string;
  status: SessionEnrollmentStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface ExpectedParticipant {
  enrollmentId: string;
  studentId: string;
  fullName: string;
}
