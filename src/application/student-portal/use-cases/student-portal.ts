import { z } from "zod";
import { parseWithSchema } from "@/application/shared/validation/parse-with-schema";
import type { StudentPortalPort } from "../ports/student-portal-port";

const tokenSchema = z.string().regex(/^[a-f0-9]{64}$/);
const idSchema = z.string().uuid();

export async function createStudentPortalInvitation(
  input: {
    tenantId: string;
    studentId: string;
    tokenHash: string;
    expiresAt: Date;
  },
  deps: { portal: StudentPortalPort },
) {
  const parsed = parseWithSchema(
    z.object({
      tenantId: idSchema,
      studentId: idSchema,
      tokenHash: tokenSchema,
      expiresAt: z.date(),
    }),
    input,
  );
  return deps.portal.createInvitation(parsed);
}

export async function lookupStudentPortalInvitation(
  tokenHash: string,
  deps: { portal: StudentPortalPort },
) {
  return deps.portal.lookupInvitation(parseWithSchema(tokenSchema, tokenHash));
}

export async function hasPendingStudentPortalInvitation(deps: {
  portal: StudentPortalPort;
}) {
  return deps.portal.hasPendingInvitationForCurrentUser();
}

export async function redeemStudentPortalInvitation(
  tokenHash: string,
  deps: { portal: StudentPortalPort },
) {
  return deps.portal.redeemInvitation(parseWithSchema(tokenSchema, tokenHash));
}

export async function listMyStudentPortalStudents(deps: {
  portal: StudentPortalPort;
}) {
  return deps.portal.listMyStudents();
}

export async function listStudentPortalSessions(
  studentId: string,
  deps: { portal: StudentPortalPort },
) {
  return deps.portal.listSessions(parseWithSchema(idSchema, studentId));
}

export async function listStudentPortalAttendanceHistory(
  studentId: string,
  deps: { portal: StudentPortalPort },
) {
  return deps.portal.listAttendanceHistory(
    parseWithSchema(idSchema, studentId),
  );
}

export async function enrollStudentPortalSession(
  input: { tenantId: string; studentId: string; sessionId: string },
  deps: { portal: StudentPortalPort },
) {
  const parsed = parseWithSchema(
    z.object({ tenantId: idSchema, studentId: idSchema, sessionId: idSchema }),
    input,
  );
  return deps.portal.enroll(parsed);
}

export async function cancelStudentPortalSession(
  input: { tenantId: string; studentId: string; sessionId: string },
  deps: { portal: StudentPortalPort },
) {
  const parsed = parseWithSchema(
    z.object({ tenantId: idSchema, studentId: idSchema, sessionId: idSchema }),
    input,
  );
  return deps.portal.cancelEnrollment(parsed);
}
