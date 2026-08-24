export interface DayLocation {
  id: string;
  name: string;
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
}

export interface InstructorDay {
  activeStudents: number;
  pendingEnrollments: number;
  locations: DayLocation[];
  currentSession: DaySession | null;
  upcomingSessions: DaySession[];
}
