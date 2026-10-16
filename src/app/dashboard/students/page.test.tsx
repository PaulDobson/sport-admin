import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import StudentsPage from "./page";

const membership = vi.hoisted(() => vi.fn());
const list = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({ redirect: (path: string) => { throw new Error(`redirect:${path}`); } }));
vi.mock("@/app/_lib/operational-context", () => ({ requireOperationalMembership: membership }));
vi.mock("@/infrastructure/composition/instructor-operations-composition", () => ({ createInstructorOperationsDeps: async () => ({ students: {} }) }));
vi.mock("@/application/instructor-operations/use-cases/list-students-for-administration", () => ({ listStudentsForAdministration: list }));
vi.mock("./student-archive-button", () => ({ StudentArchiveButton: ({ studentName }: { studentName: string }) => <button>Archivar {studentName}</button> }));

afterEach(cleanup);
beforeEach(() => {
  membership.mockResolvedValue({ tenantId: "tenant-1", role: "owner" });
  list.mockResolvedValue({ page: 2, pageSize: 10, total: 11, rows: [{ id: "student-1", fullName: "Ana Bravo", photoUrl: null, birthDate: null, status: "active", createdAt: new Date("2026-09-01"), contactPhone: "+56 9 1111", contactEmail: "ana@example.com" }] });
});

describe("StudentsPage", () => {
  const query = { search: "Ana", status: "active", page: "2", pageSize: "10" };
  it("renders equivalent cards/table and separate creation with current query", async () => {
    render(await StudentsPage({ searchParams: Promise.resolve(query) }));
    const table = screen.getByRole("table");
    const cards = screen.getByRole("list", { name: "Alumnos" });
    for (const view of [table, cards]) {
      expect(within(view).getByText("ana@example.com")).toBeTruthy();
      expect(within(view).getByText("Activo")).toBeTruthy();
      expect(within(view).getByRole("link", { name: "Ver ficha de Ana Bravo" }).getAttribute("href")).toBe("/dashboard/students/student-1?search=Ana&status=active&page=2&pageSize=10");
    }
    expect(screen.getByRole("link", { name: "Nuevo alumno" }).getAttribute("href")).toBe("/dashboard/students/new?search=Ana&status=active&page=2&pageSize=10");
    expect(screen.queryByLabelText("Nombre completo")).toBeNull();
    expect(screen.getByRole("link", { name: "Exportar página a Excel" }).getAttribute("href")).toBe("/api/students/export?search=Ana&status=active&page=2&pageSize=10");
    expect(screen.getByText("Mostrando 11–11 de 11")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Archivados" }).getAttribute("href")).toContain("status=archived&page=1");
  });

  it("hides administrative actions for assistants", async () => {
    membership.mockResolvedValue({ tenantId: "tenant-1", role: "assistant" });
    render(await StudentsPage({ searchParams: Promise.resolve(query) }));
    expect(screen.queryByRole("link", { name: "Nuevo alumno" })).toBeNull();
    expect(screen.queryByRole("link", { name: /Exportar/ })).toBeNull();
    expect(screen.queryByRole("link", { name: /Editar/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /Archivar/ })).toBeNull();
  });

  it("redirects to the actual page when results shrink", async () => {
    list.mockResolvedValue({ page: 1, pageSize: 10, total: 0, rows: [] });
    await expect(StudentsPage({ searchParams: Promise.resolve(query) })).rejects.toThrow("redirect:/dashboard/students?search=Ana&status=active&page=1&pageSize=10");
  });

  it("offers filter recovery without a permanent form", async () => {
    list.mockResolvedValue({ page: 1, pageSize: 10, total: 0, rows: [] });
    render(await StudentsPage({ searchParams: Promise.resolve({ search: "missing" }) }));
    expect(screen.getByText("Sin resultados para estos filtros")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Limpiar búsqueda y filtros" })).toBeTruthy();
    expect(screen.queryByRole("table")).toBeNull();
  });
});
