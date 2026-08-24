import type {
  Student,
  StudentContact,
  StudentContactType,
} from "@/domain/instructor-operations/student";

export interface CreateStudentInput {
  tenantId: string;
  fullName: string;
  photoUrl: string | null;
  birthDate: string | null;
  contacts: Array<{
    type: StudentContactType;
    label: string | null;
    value: string;
    isPrimary: boolean;
  }>;
}

export interface StudentRepositoryPort {
  create(input: CreateStudentInput): Promise<{
    student: Student;
    contacts: StudentContact[];
  }>;
  archive(tenantId: string, studentId: string): Promise<Student>;
  findById(tenantId: string, studentId: string): Promise<Student | null>;
  findActiveByTenant(tenantId: string): Promise<Student[]>;
}
