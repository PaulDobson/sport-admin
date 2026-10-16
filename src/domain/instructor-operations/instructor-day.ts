import type { ClassSessionStatus } from "./session";

export interface DayLocation {
  id: string;
  name: string;
  address?: string | null;
}

export interface DaySession {
  id: string;
  name: string;
  locationId: string;
  locationName: string;
  startsAt: Date;
  endsAt: Date;
  capacity: number;
  confirmedCount: number;
  waitlistedCount: number;
  /** Students marked present or late without a confirmed reservation. */
  walkInCount?: number;
  /** Students marked present or late, with or without reservation. */
  attendedCount?: number;
  status?: ClassSessionStatus;
}

export interface InstructorDay {
  activeStudents: number;
  pendingEnrollments: number;
  locations: DayLocation[];
  currentSession: DaySession | null;
  upcomingSessions: DaySession[];
}
