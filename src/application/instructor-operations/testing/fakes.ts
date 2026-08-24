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
