import type { ClassSession } from "@/domain/instructor-operations/session";

export interface OneOffSessionInput {
  tenantId: string;
  classTemplateId: string;
  locationId: string;
  instructorMembershipId: string;
  startsAtLocal: string;
  endsAtLocal: string;
  timezone: string;
  waitlistEnabled: boolean;
}

export interface PublishScheduleInput {
  tenantId: string;
  classScheduleId: string;
  fromDate: string;
  throughDate: string;
  waitlistEnabled: boolean;
}

export interface SessionPublishingPort {
  createOneOff(input: OneOffSessionInput): Promise<ClassSession>;
  publishSchedule(input: PublishScheduleInput): Promise<number>;
}
