import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Student,
  StudentContact,
  StudentContactType,
  StudentStatus,
} from "@/domain/instructor-operations/student";
import { NotFoundError } from "@/domain/shared/errors";
import { throwMappedSaasLimitError } from "@/infrastructure/saas-administration/map-saas-limit-error";
import type {
  CreateStudentInput,
  StudentRepositoryPort,
} from "@/application/instructor-operations/ports/student-repository-port";

interface StudentRow {
  id: string;
  tenant_id: string;
  full_name: string;
  photo_url: string | null;
  birth_date: string | null;
  status: StudentStatus;
  archived_at: string | null;
  created_at: string;
}

interface StudentContactRow {
  id: string;
  tenant_id: string;
  student_id: string;
  type: StudentContactType;
  label: string | null;
  value: string;
  is_primary: boolean;
  status: StudentStatus;
  created_at: string;
}

function toStudent(row: StudentRow): Student {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    fullName: row.full_name,
    photoUrl: row.photo_url,
    birthDate: row.birth_date,
    status: row.status,
    archivedAt: row.archived_at ? new Date(row.archived_at) : null,
    createdAt: new Date(row.created_at),
  };
}

function toContact(row: StudentContactRow): StudentContact {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    studentId: row.student_id,
    type: row.type,
    label: row.label,
    value: row.value,
    isPrimary: row.is_primary,
    status: row.status,
    createdAt: new Date(row.created_at),
  };
}

export class SupabaseStudentRepository implements StudentRepositoryPort {
  constructor(private readonly client: SupabaseClient) {}

  async create(input: CreateStudentInput) {
    const { data: studentData, error: studentError } = await this.client
      .from("students")
      .insert({
        tenant_id: input.tenantId,
        full_name: input.fullName,
        photo_url: input.photoUrl,
        birth_date: input.birthDate,
      })
      .select()
      .single();
    if (studentError || !studentData) {
      if (studentError) throwMappedSaasLimitError(studentError);
      throw new Error("Failed to create student");
    }

    const student = toStudent(studentData as StudentRow);
    if (input.contacts.length === 0) return { student, contacts: [] };

    const { data: contactData, error: contactError } = await this.client
      .from("student_contacts")
      .insert(
        input.contacts.map((contact) => ({
          tenant_id: input.tenantId,
          student_id: student.id,
          type: contact.type,
          label: contact.label,
          value: contact.value,
          is_primary: contact.isPrimary,
        })),
      )
      .select();

    if (contactError || !contactData) {
      await this.client
        .from("students")
        .delete()
        .eq("tenant_id", input.tenantId)
        .eq("id", student.id);
      throw contactError ?? new Error("Failed to create student contacts");
    }

    return {
      student,
      contacts: (contactData as StudentContactRow[]).map(toContact),
    };
  }

  async archive(tenantId: string, studentId: string): Promise<Student> {
    const { data, error } = await this.client
      .from("students")
      .update({ status: "archived", archived_at: new Date().toISOString() })
      .eq("tenant_id", tenantId)
      .eq("id", studentId)
      .select()
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new NotFoundError("Student", studentId);
    return toStudent(data as StudentRow);
  }

  async findActiveByTenant(tenantId: string): Promise<Student[]> {
    const { data, error } = await this.client
      .from("students")
      .select()
      .eq("tenant_id", tenantId)
      .eq("status", "active")
      .order("full_name");
    if (error) throw error;
    return (data as StudentRow[]).map(toStudent);
  }

  async findById(tenantId: string, studentId: string) {
    const { data, error } = await this.client
      .from("students")
      .select()
      .eq("tenant_id", tenantId)
      .eq("id", studentId)
      .maybeSingle();
    if (error) throw error;
    return data ? toStudent(data as StudentRow) : null;
  }
}
