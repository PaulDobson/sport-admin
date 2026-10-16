interface EnrollmentRow {
  status: string;
  student_id?: string | null;
}

interface AttendanceRow {
  status: string;
  student_id: string;
}

const attendedStatuses = new Set(["present", "late"]);

/**
 * Students who attended without a confirmed reservation still occupy a spot,
 * so they are counted apart from confirmed enrollments.
 */
export function sessionParticipation(
  enrollments: EnrollmentRow[],
  attendance: AttendanceRow[] = [],
) {
  const confirmed = enrollments.filter((enrollment) => enrollment.status === "confirmed");
  const confirmedStudents = new Set(confirmed.map((enrollment) => enrollment.student_id));
  const attended = attendance.filter((record) => attendedStatuses.has(record.status));
  return {
    confirmedCount: confirmed.length,
    waitlistedCount: enrollments.filter((enrollment) => enrollment.status === "waitlisted").length,
    walkInCount: attended.filter((record) => !confirmedStudents.has(record.student_id)).length,
    attendedCount: attended.length,
  };
}
