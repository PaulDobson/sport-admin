import {
  BusinessRuleViolationError,
  NotFoundError,
} from "@/domain/shared/errors";
import type {
  ClassSession,
  SessionEnrollment,
} from "@/domain/instructor-operations/session";
import type {
  EditSessionInput,
  GenerateSessionInput,
  SessionRepositoryPort,
} from "../ports/session-repository-port";

export class FakeSessionRepository implements SessionRepositoryPort {
  readonly sessions: ClassSession[] = [];
  readonly enrollments: SessionEnrollment[] = [];
  readonly students = new Map<
    string,
    { tenantId: string; fullName: string; active: boolean }
  >();

  schedule = {
    id: "10000000-0000-4000-8000-000000000002",
    tenantId: "10000000-0000-4000-8000-000000000001",
    classTemplateId: "10000000-0000-4000-8000-000000000003",
    locationId: "10000000-0000-4000-8000-000000000004",
    instructorMembershipId: "10000000-0000-4000-8000-000000000005",
    timezone: "America/Argentina/Buenos_Aires",
    capacity: 2,
    active: true,
  };

  async generate(input: GenerateSessionInput) {
    if (
      !this.schedule.active ||
      this.schedule.id !== input.classScheduleId ||
      this.schedule.tenantId !== input.tenantId
    ) {
      throw new NotFoundError("Class schedule", input.classScheduleId);
    }
    const now = new Date();
    const session: ClassSession = {
      ...input,
      id: `10000000-0000-4000-8000-${String(this.sessions.length + 10).padStart(12, "0")}`,
      classTemplateId: this.schedule.classTemplateId,
      locationId: this.schedule.locationId,
      instructorMembershipId: this.schedule.instructorMembershipId,
      timezone: this.schedule.timezone,
      capacity: this.schedule.capacity,
      status: "scheduled",
      createdAt: now,
      updatedAt: now,
    };
    this.sessions.push(session);
    return session;
  }

  async update(input: EditSessionInput) {
    const session = this.findSession(input.tenantId, input.sessionId);
    const startsAt = input.startsAt ?? session.startsAt;
    const endsAt = input.endsAt ?? session.endsAt;
    if (endsAt <= startsAt) {
      throw new BusinessRuleViolationError("Session end must be after start");
    }
    const capacity = input.capacity ?? session.capacity;
    const confirmed = this.enrollments.filter(
      (enrollment) =>
        enrollment.sessionId === session.id &&
        enrollment.status === "confirmed",
    ).length;
    if (capacity < confirmed) {
      throw new BusinessRuleViolationError(
        "Session capacity cannot be lower than confirmed enrollments",
      );
    }
    Object.assign(session, input, {
      startsAt,
      endsAt,
      capacity,
      updatedAt: new Date(),
    });
    return session;
  }

  async enroll(input: {
    tenantId: string;
    sessionId: string;
    studentId: string;
  }) {
    const session = this.findSession(input.tenantId, input.sessionId);
    const student = this.students.get(input.studentId);
    if (!student?.active || student.tenantId !== input.tenantId) {
      throw new NotFoundError("Active student", input.studentId);
    }
    if (session.status !== "scheduled") {
      throw new BusinessRuleViolationError(
        "Session is not open for enrollment",
      );
    }
    const current = this.enrollments.find(
      (enrollment) =>
        enrollment.sessionId === input.sessionId &&
        enrollment.studentId === input.studentId &&
        enrollment.status !== "cancelled",
    );
    if (current) return current;
    const confirmed = this.enrollments.filter(
      (enrollment) =>
        enrollment.sessionId === session.id &&
        enrollment.status === "confirmed",
    ).length;
    if (confirmed >= session.capacity && !session.waitlistEnabled) {
      throw new BusinessRuleViolationError("Session capacity is full");
    }
    const now = new Date();
    const enrollment: SessionEnrollment = {
      ...input,
      id: `10000000-0000-4000-8001-${String(this.enrollments.length + 10).padStart(12, "0")}`,
      status: confirmed < session.capacity ? "confirmed" : "waitlisted",
      createdAt: now,
      updatedAt: now,
    };
    this.enrollments.push(enrollment);
    return enrollment;
  }

  async cancelEnrollment(input: {
    tenantId: string;
    sessionId: string;
    studentId: string;
  }) {
    this.findSession(input.tenantId, input.sessionId);
    const enrollment = this.enrollments.find(
      (candidate) =>
        candidate.tenantId === input.tenantId &&
        candidate.sessionId === input.sessionId &&
        candidate.studentId === input.studentId &&
        candidate.status !== "cancelled",
    );
    if (!enrollment)
      throw new NotFoundError("Session enrollment", input.studentId);
    const shouldPromote = enrollment.status === "confirmed";
    enrollment.status = "cancelled";
    enrollment.updatedAt = new Date();

    if (shouldPromote) {
      const nextWaitlisted = this.enrollments.find(
        (candidate) =>
          candidate.tenantId === input.tenantId &&
          candidate.sessionId === input.sessionId &&
          candidate.status === "waitlisted",
      );
      if (nextWaitlisted) {
        nextWaitlisted.status = "confirmed";
        nextWaitlisted.updatedAt = new Date();
      }
    }
    return enrollment;
  }

  async listExpectedParticipants(tenantId: string, sessionId: string) {
    this.findSession(tenantId, sessionId);
    return this.enrollments
      .filter(
        (enrollment) =>
          enrollment.tenantId === tenantId &&
          enrollment.sessionId === sessionId &&
          enrollment.status === "confirmed",
      )
      .map((enrollment) => ({
        enrollmentId: enrollment.id,
        studentId: enrollment.studentId,
        fullName: this.students.get(enrollment.studentId)?.fullName ?? "",
      }));
  }

  private findSession(tenantId: string, sessionId: string) {
    const session = this.sessions.find(
      (candidate) =>
        candidate.id === sessionId && candidate.tenantId === tenantId,
    );
    if (!session) throw new NotFoundError("Class session", sessionId);
    return session;
  }
}
