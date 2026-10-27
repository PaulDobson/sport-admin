export interface StudentPortalInvite {
  email: string;
  tenantName: string;
  expiresAt: Date;
}

export interface StudentPortalStudent {
  id: string;
  tenantId: string;
  fullName: string;
  tenantName: string;
}

export interface StudentPortalSession {
  id: string;
  tenantId: string;
  studentId: string;
  className: string;
  locationName: string;
  startsAt: Date;
  endsAt: Date;
  timezone: string;
  capacity: number;
  confirmedCount: number;
  waitlistedCount: number;
  enrollmentStatus: "confirmed" | "waitlisted" | "cancelled" | null;
  waitlistEnabled: boolean;
}

export type AttendanceStatus = "present" | "late" | "absent" | null;

export interface StudentPortalAttendanceRecord {
  sessionId: string;
  tenantId: string;
  studentId: string;
  className: string;
  locationName: string;
  startsAt: Date;
  endsAt: Date;
  timezone: string;
  attendanceStatus: AttendanceStatus;
}

export interface StudentPortalPort {
  createInvitation(input: {
    tenantId: string;
    studentId: string;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<StudentPortalInvite>;
  lookupInvitation(tokenHash: string): Promise<StudentPortalInvite | null>;
  hasPendingInvitationForCurrentUser(): Promise<boolean>;
  redeemInvitation(tokenHash: string): Promise<void>;
  listMyStudents(): Promise<StudentPortalStudent[]>;
  listSessions(studentId: string): Promise<StudentPortalSession[]>;
  listAttendanceHistory(
    studentId: string,
  ): Promise<StudentPortalAttendanceRecord[]>;
  enroll(input: {
    tenantId: string;
    studentId: string;
    sessionId: string;
  }): Promise<"confirmed" | "waitlisted">;
  cancelEnrollment(input: {
    tenantId: string;
    studentId: string;
    sessionId: string;
  }): Promise<void>;
}
