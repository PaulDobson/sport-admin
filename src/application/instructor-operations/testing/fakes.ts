import type { Location } from "@/domain/instructor-operations/location";
import type {
  Student,
  StudentContact,
} from "@/domain/instructor-operations/student";
import { NotFoundError } from "@/domain/shared/errors";
import type { LocationRepositoryPort } from "../ports/location-repository-port";
import type {
  CreateStudentInput,
  StudentRepositoryPort,
  UpdateStudentInput,
} from "../ports/student-repository-port";

export class FakeStudentRepository implements StudentRepositoryPort {
  readonly students: Student[] = [];
  readonly contacts: StudentContact[] = [];

  async create(input: CreateStudentInput) {
    const now = new Date();
    const student: Student = {
      id: `student-${this.students.length + 1}`,
      tenantId: input.tenantId,
      fullName: input.fullName,
      photoUrl: input.photoUrl,
      birthDate: input.birthDate,
      status: "active",
      archivedAt: null,
      createdAt: now,
    };
    const contacts = input.contacts.map<StudentContact>((contact, index) => ({
      id: `contact-${this.contacts.length + index + 1}`,
      tenantId: input.tenantId,
      studentId: student.id,
      status: "active",
      createdAt: now,
      ...contact,
    }));
    this.students.push(student);
    this.contacts.push(...contacts);
    return { student, contacts };
  }

  async archive(tenantId: string, studentId: string): Promise<Student> {
    const student = this.students.find(
      (candidate) =>
        candidate.id === studentId && candidate.tenantId === tenantId,
    );
    if (!student) throw new NotFoundError("Student", studentId);
    student.status = "archived";
    student.archivedAt = new Date();
    return student;
  }

  async update(input: UpdateStudentInput) {
    const student = this.students.find(
      (candidate) =>
        candidate.id === input.studentId &&
        candidate.tenantId === input.tenantId,
    );
    if (!student) throw new NotFoundError("Student", input.studentId);
    student.fullName = input.fullName;
    student.birthDate = input.birthDate;

    this.contacts.forEach((contact) => {
      if (
        contact.tenantId === input.tenantId &&
        contact.studentId === input.studentId &&
        contact.isPrimary
      ) {
        contact.status = "archived";
        contact.isPrimary = false;
      }
    });

    if (input.primaryContact) {
      this.contacts.push({
        id: `contact-${this.contacts.length + 1}`,
        tenantId: input.tenantId,
        studentId: input.studentId,
        status: "active",
        createdAt: new Date(),
        isPrimary: true,
        ...input.primaryContact,
      });
    }

    return {
      student,
      contacts: this.contacts.filter(
        (contact) =>
          contact.tenantId === input.tenantId &&
          contact.studentId === input.studentId &&
          contact.status === "active",
      ),
    };
  }

  async findActiveByTenant(tenantId: string): Promise<Student[]> {
    return this.students.filter(
      (student) => student.tenantId === tenantId && student.status === "active",
    );
  }

  async findById(tenantId: string, studentId: string) {
    return (
      this.students.find(
        (student) => student.tenantId === tenantId && student.id === studentId,
      ) ?? null
    );
  }

  async findAdministrationRowById(tenantId: string, studentId: string) {
    const result = await this.listForAdministration({
      tenantId,
      page: 1,
      pageSize: Math.max(1, this.students.length),
      search: null,
      status: "all",
    });
    return result.rows.find((student) => student.id === studentId) ?? null;
  }

  async listForAdministration(
    query: Parameters<StudentRepositoryPort["listForAdministration"]>[0],
  ) {
    const search = query.search?.toLocaleLowerCase("es") ?? null;
    const filtered = this.students
      .filter((student) => student.tenantId === query.tenantId)
      .filter((student) =>
        query.status === "all" ? true : student.status === query.status,
      )
      .filter((student) => {
        if (!search) return true;
        const primaryContact = this.contacts.find(
          (contact) =>
            contact.tenantId === query.tenantId &&
            contact.studentId === student.id &&
            contact.status === "active" &&
            contact.isPrimary,
        );
        return [student.fullName, primaryContact?.value ?? ""]
          .join(" ")
          .toLocaleLowerCase("es")
          .includes(search);
      })
      .sort((left, right) => left.fullName.localeCompare(right.fullName, "es"));
    const offset = (query.page - 1) * query.pageSize;
    return {
      total: filtered.length,
      page: query.page,
      pageSize: query.pageSize,
      rows: filtered.slice(offset, offset + query.pageSize).map((student) => {
        const primaryContact = this.contacts.find(
          (contact) =>
            contact.tenantId === query.tenantId &&
            contact.studentId === student.id &&
            contact.status === "active" &&
            contact.isPrimary,
        );
        return {
          id: student.id,
          tenantId: student.tenantId,
          fullName: student.fullName,
          birthDate: student.birthDate,
          status: student.status,
          createdAt: student.createdAt,
          archivedAt: student.archivedAt,
          primaryContact: primaryContact
            ? {
                type: primaryContact.type,
                label: primaryContact.label,
                value: primaryContact.value,
                isPrimary: primaryContact.isPrimary,
              }
            : null,
        };
      }),
    };
  }
}

export class FakeLocationRepository implements LocationRepositoryPort {
  readonly locations: Location[] = [];

  async create(
    input: Parameters<LocationRepositoryPort["create"]>[0],
  ): Promise<Location> {
    const location: Location = {
      id: `location-${this.locations.length + 1}`,
      status: "active",
      createdAt: new Date(),
      ...input,
    };
    this.locations.push(location);
    return location;
  }

  async archive(tenantId: string, locationId: string): Promise<Location> {
    const location = this.locations.find(
      (candidate) =>
        candidate.id === locationId && candidate.tenantId === tenantId,
    );
    if (!location) throw new NotFoundError("Location", locationId);
    location.status = "archived";
    return location;
  }

  async findActiveByTenant(tenantId: string): Promise<Location[]> {
    return this.locations.filter(
      (location) =>
        location.tenantId === tenantId && location.status === "active",
    );
  }
}
