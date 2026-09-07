import type { SupabaseDatabaseClient } from "@/infrastructure/supabase/database-client";
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
  StudentAdministrationQuery,
  StudentAdministrationRow,
  StudentRepositoryPort,
  UpdateStudentInput,
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

function toAdministrationRow(
  row: StudentRow,
  primaryContact: StudentContactRow | null,
): StudentAdministrationRow {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    fullName: row.full_name,
    birthDate: row.birth_date,
    status: row.status,
    archivedAt: row.archived_at ? new Date(row.archived_at) : null,
    createdAt: new Date(row.created_at),
    primaryContact: primaryContact
      ? {
          type: primaryContact.type,
          label: primaryContact.label,
          value: primaryContact.value,
          isPrimary: primaryContact.is_primary,
        }
      : null,
  };
}

export class SupabaseStudentRepository implements StudentRepositoryPort {
  constructor(private readonly client: SupabaseDatabaseClient) {}

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

  async update(input: UpdateStudentInput) {
    const { data: studentData, error: studentError } = await this.client
      .from("students")
      .update({
        full_name: input.fullName,
        birth_date: input.birthDate,
      })
      .eq("tenant_id", input.tenantId)
      .eq("id", input.studentId)
      .select()
      .maybeSingle();
    if (studentError) throw studentError;
    if (!studentData) throw new NotFoundError("Student", input.studentId);

    const { error: archiveContactsError } = await this.client
      .from("student_contacts")
      .update({ status: "archived", is_primary: false })
      .eq("tenant_id", input.tenantId)
      .eq("student_id", input.studentId)
      .eq("status", "active")
      .eq("is_primary", true);
    if (archiveContactsError) throw archiveContactsError;

    if (input.primaryContact) {
      const { error: insertContactError } = await this.client
        .from("student_contacts")
        .insert({
          tenant_id: input.tenantId,
          student_id: input.studentId,
          type: input.primaryContact.type,
          label: input.primaryContact.label,
          value: input.primaryContact.value,
          is_primary: true,
        });
      if (insertContactError) throw insertContactError;
    }

    const { data: contactData, error: contactError } = await this.client
      .from("student_contacts")
      .select()
      .eq("tenant_id", input.tenantId)
      .eq("student_id", input.studentId)
      .eq("status", "active");
    if (contactError) throw contactError;

    return {
      student: toStudent(studentData as StudentRow),
      contacts: (contactData as StudentContactRow[]).map(toContact),
    };
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

  async listForAdministration(query: StudentAdministrationQuery) {
    let studentsQuery = this.client
      .from("students")
      .select("*", { count: "exact" })
      .eq("tenant_id", query.tenantId);
    if (query.status !== "all") {
      studentsQuery = studentsQuery.eq("status", query.status);
    }
    if (query.search) {
      studentsQuery = studentsQuery.ilike("full_name", `%${query.search}%`);
    }

    const offset = (query.page - 1) * query.pageSize;
    const { data, error, count } = await studentsQuery
      .order("full_name")
      .range(offset, offset + query.pageSize - 1);
    if (error) throw error;

    const studentRows = (data ?? []) as StudentRow[];
    if (studentRows.length === 0) {
      return {
        rows: [],
        total: count ?? 0,
        page: query.page,
        pageSize: query.pageSize,
      };
    }

    const { data: contactData, error: contactError } = await this.client
      .from("student_contacts")
      .select()
      .eq("tenant_id", query.tenantId)
      .eq("status", "active")
      .eq("is_primary", true)
      .in(
        "student_id",
        studentRows.map((student) => student.id),
      );
    if (contactError) throw contactError;

    const contactsByStudent = new Map<string, StudentContactRow>();
    for (const contact of (contactData ?? []) as StudentContactRow[]) {
      if (!contactsByStudent.has(contact.student_id)) {
        contactsByStudent.set(contact.student_id, contact);
      }
    }

    return {
      rows: studentRows.map((student) =>
        toAdministrationRow(student, contactsByStudent.get(student.id) ?? null),
      ),
      total: count ?? studentRows.length,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  async findAdministrationRowById(tenantId: string, studentId: string) {
    const { data, error } = await this.client
      .from("students")
      .select()
      .eq("tenant_id", tenantId)
      .eq("id", studentId)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;

    const { data: contactData, error: contactError } = await this.client
      .from("student_contacts")
      .select()
      .eq("tenant_id", tenantId)
      .eq("student_id", studentId)
      .eq("status", "active")
      .eq("is_primary", true);
    if (contactError) throw contactError;

    return toAdministrationRow(
      data as StudentRow,
      ((contactData ?? []) as StudentContactRow[])[0] ?? null,
    );
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
