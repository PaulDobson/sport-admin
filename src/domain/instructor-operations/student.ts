export type StudentStatus = "active" | "archived";
export type StudentContactType = "email" | "phone" | "emergency";
export type StudentGender = "female" | "male" | "other";

export interface Student {
  id: string;
  tenantId: string;
  fullName: string;
  photoUrl: string | null;
  birthDate: string | null;
  gender: StudentGender | null;
  heightCm: number | null;
  weightKg: number | null;
  emergencyContactName: string | null;
  emergencyContactEmail: string | null;
  emergencyContactPhone: string | null;
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
