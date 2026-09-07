import ExcelJS from "exceljs";
import { listStudentsForAdministration } from "@/application/instructor-operations/use-cases/list-students-for-administration";
import type { StudentAdministrationStatusFilter } from "@/application/instructor-operations/ports/student-repository-port";
import { DomainError } from "@/domain/shared/errors";
import { createAuthDeps } from "@/infrastructure/composition/auth-composition";
import { createInstructorOperationsDeps } from "@/infrastructure/composition/instructor-operations-composition";
import { resolveOperationalContextForUser } from "@/app/_lib/operational-context";

const contentType =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

function parsePositiveInteger(
  value: string | null,
  fallback: number,
  max: number,
) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, max);
}

function parseStatus(value: string | null): StudentAdministrationStatusFilter {
  return value === "archived" || value === "all" ? value : "active";
}

function roleLabelFor(role: string) {
  return role === "owner"
    ? "Dueño"
    : role === "assistant"
      ? "Asistente"
      : role === "admin"
        ? "Administrador"
        : role;
}

function statusLabel(status: StudentAdministrationStatusFilter) {
  return status === "archived"
    ? "Archivados"
    : status === "all"
      ? "Todos"
      : "Activos";
}

function contactValue(
  contact: { type: string; label: string | null; value: string } | null,
) {
  if (!contact) return "";
  const typeLabel =
    contact.type === "email"
      ? "Email"
      : contact.type === "emergency"
        ? "Emergencia"
        : "Telefono";
  return `${contact.label ?? typeLabel}: ${contact.value}`;
}

export async function GET(request: Request) {
  const auth = await createAuthDeps();
  const userId = await auth.auth.getCurrentUserId();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const context = await resolveOperationalContextForUser(
      userId,
      auth.memberships,
    );
    if (context.status === "selection-required") {
      return Response.json(
        { error: "Tenant selection required" },
        { status: 409 },
      );
    }
    if (context.status !== "ready") {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }
    if (context.membership.role === "assistant") {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const url = new URL(request.url);
    const page = parsePositiveInteger(url.searchParams.get("page"), 1, 10_000);
    const pageSize = parsePositiveInteger(
      url.searchParams.get("pageSize"),
      10,
      100,
    );
    const search = url.searchParams.get("search")?.trim() ?? "";
    const status = parseStatus(url.searchParams.get("status"));
    const tenantId = context.membership.tenantId;
    const operations = await createInstructorOperationsDeps();
    const [students, tenants] = await Promise.all([
      listStudentsForAdministration(
        { tenantId, page, pageSize, search, status },
        operations,
      ),
      auth.tenants.findOperationalByUser(userId),
    ]);
    const academyName =
      tenants.find((tenant) => tenant.id === tenantId)?.name ??
      "Academia activa";

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Sport Admin";
    workbook.created = new Date();
    const worksheet = workbook.addWorksheet("Alumnos");
    worksheet.columns = [
      { header: "Campo", key: "field", width: 24 },
      { header: "Valor", key: "value", width: 36 },
      { header: "Nombre", key: "name", width: 32 },
      { header: "Contacto", key: "contact", width: 34 },
      { header: "Nacimiento", key: "birthDate", width: 16 },
      { header: "Estado", key: "status", width: 16 },
      { header: "Creado", key: "createdAt", width: 16 },
    ];
    worksheet.getRow(1).values = ["Academia", academyName];
    worksheet.getRow(2).values = ["Rol", roleLabelFor(context.membership.role)];
    worksheet.getRow(3).values = [
      "Fecha de exportacion",
      new Date().toISOString(),
    ];
    worksheet.getRow(4).values = ["Estado", statusLabel(status)];
    worksheet.getRow(5).values = ["Busqueda", search || "Sin busqueda"];
    worksheet.getRow(6).values = ["Pagina", `${students.page}`];
    worksheet.getRow(7).values = ["Filas por pagina", `${students.pageSize}`];
    worksheet.getRow(9).values = [
      "Nombre",
      "Contacto principal",
      "Fecha de nacimiento",
      "Estado",
      "Creado",
    ];
    worksheet.getRow(9).font = { bold: true };
    students.rows.forEach((student, index) => {
      worksheet.getRow(10 + index).values = [
        student.fullName,
        contactValue(student.primaryContact),
        student.birthDate ?? "",
        student.status === "active" ? "Activo" : "Archivado",
        student.createdAt.toISOString().slice(0, 10),
      ];
    });
    worksheet.getRow(1).font = { bold: true };

    const buffer = await workbook.xlsx.writeBuffer();
    return new Response(buffer, {
      headers: {
        "content-type": contentType,
        "content-disposition": `attachment; filename="alumnos-${tenantId}.xlsx"`,
        "cache-control": "private, no-store",
      },
    });
  } catch (error) {
    if (error instanceof DomainError) {
      return Response.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}
