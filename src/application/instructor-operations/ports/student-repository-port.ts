import type {
  Student,
  StudentContact,
  StudentContactType,
  StudentStatus,
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

export type StudentAdministrationStatusFilter = StudentStatus | "all";

export interface StudentAdministrationQuery {
  tenantId: string;
  page: number;
  pageSize: number;
  search: string | null;
  status: StudentAdministrationStatusFilter;
}

export interface StudentAdministrationRow {
  id: string;
  tenantId: string;
  fullName: string;
  birthDate: string | null;
  status: StudentStatus;
  createdAt: Date;
  archivedAt: Date | null;
  primaryContact: Pick<
    StudentContact,
    "type" | "label" | "value" | "isPrimary"
  > | null;
}

export interface StudentAdministrationResult {
  rows: StudentAdministrationRow[];
  total: number;
  page: number;
  pageSize: number;
}

export interface UpdateStudentInput {
  tenantId: string;
  studentId: string;
  fullName: string;
  birthDate: string | null;
  primaryContact: {
    type: StudentContactType;
    label: string | null;
    value: string;
  } | null;
}

export interface StudentRepositoryPort {
  create(input: CreateStudentInput): Promise<{
    student: Student;
    contacts: StudentContact[];
  }>;
  archive(tenantId: string, studentId: string): Promise<Student>;
  update(input: UpdateStudentInput): Promise<{
    student: Student;
    contacts: StudentContact[];
  }>;
  findById(tenantId: string, studentId: string): Promise<Student | null>;
  findActiveByTenant(tenantId: string): Promise<Student[]>;
  findAdministrationRowById(
    tenantId: string,
    studentId: string,
  ): Promise<StudentAdministrationRow | null>;
  listForAdministration(
    query: StudentAdministrationQuery,
  ): Promise<StudentAdministrationResult>;
}
