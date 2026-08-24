export type StudentStatus = "active" | "archived";
export type StudentContactType = "email" | "phone" | "emergency";

export interface Student {
  id: string;
  tenantId: string;
  fullName: string;
  photoUrl: string | null;
  birthDate: string | null;
  status: StudentStatus;
  archivedAt: Date | null;
  createdAt: Date;
}

export interface StudentContact {
  id: string;
  tenantId: string;
  studentId: string;
  type: StudentContactType;
  label: string | null;
  value: string;
  isPrimary: boolean;
  status: StudentStatus;
  createdAt: Date;
}
