import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import StudentsPage from "./page";

const requireOperationalMembership = vi.fn();
const createAuthDeps = vi.fn();
const createInstructorOperationsDeps = vi.fn();
const listStudentsForAdministration = vi.fn();

vi.mock("next/navigation", () => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`redirect:${path}`);
  }),
  usePathname: () => "/dashboard/students",
}));
vi.mock("@/app/_lib/operational-context", () => ({
  requireOperationalMembership: () => requireOperationalMembership(),
}));
vi.mock("@/infrastructure/composition/auth-composition", () => ({
  createAuthDeps: () => createAuthDeps(),
}));
vi.mock(
  "@/infrastructure/composition/instructor-operations-composition",
  () => ({
    createInstructorOperationsDeps: () => createInstructorOperationsDeps(),
  }),
);
vi.mock(
  "@/application/instructor-operations/use-cases/list-students-for-administration",
  () => ({
    listStudentsForAdministration: (...args: unknown[]) =>
      listStudentsForAdministration(...args),
  }),
);
vi.mock("./student-archive-button", () => ({
  StudentArchiveButton: ({ studentName }: { studentName: string }) => (
    <button type="button">Eliminar {studentName}</button>
  ),
}));

afterEach(cleanup);

describe("StudentsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireOperationalMembership.mockResolvedValue({
      tenantId: "tenant-1",
      role: "owner",
    });
    createAuthDeps.mockResolvedValue({
      auth: { getCurrentUserId: async () => "user-1" },
      profiles: { findByUserId: async () => ({ fullName: "Maya Torres" }) },
      tenants: {
        findOperationalByUser: async () => [
          { id: "tenant-1", name: "Academia Norte" },
        ],
      },
    });
    createInstructorOperationsDeps.mockResolvedValue({ students: {} });
    listStudentsForAdministration.mockResolvedValue({
      page: 2,
      pageSize: 10,
      total: 11,
      rows: [
        {
          id: "student-1",
          tenantId: "tenant-1",
          fullName: "Ana Bravo",
          birthDate: "1995-01-01",
          status: "active",
          createdAt: new Date("2026-09-01T00:00:00.000Z"),
          archivedAt: null,
          primaryContact: {
            type: "phone",
            label: null,
            value: "+56 9 1111",
            isPrimary: true,
          },
        },
      ],
    });
  });

  it("renders academy context, table actions, and export for the current view", async () => {
    render(
      await StudentsPage({
        searchParams: Promise.resolve({
          search: "Ana",
          status: "active",
          page: "2",
          pageSize: "10",
        }),
      }),
    );

    expect(
      screen.getAllByText(/Academia Norte · Dueño/).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByText("Administración de alumnos").length,
    ).toBeGreaterThan(0);
    expect(
      screen.queryByRole("complementary", { name: "Contexto operativo" }),
    ).toBeNull();
    expect(listStudentsForAdministration).toHaveBeenCalledWith(
      {
        tenantId: "tenant-1",
        page: 2,
        pageSize: 10,
        search: "Ana",
        status: "active",
      },
      expect.anything(),
    );

    const table = screen.getByRole("table");
    expect(within(table).getByText("Ana Bravo")).toBeTruthy();
    expect(within(table).getByText("Teléfono: +56 9 1111")).toBeTruthy();
    expect(
      screen
        .getByRole("link", { name: "Visualizar Ana Bravo" })
        .getAttribute("href"),
    ).toBe("/dashboard/students/student-1");
    expect(
      screen
        .getByRole("link", { name: "Editar Ana Bravo" })
        .getAttribute("href"),
    ).toBe("/dashboard/students/student-1/edit");
    expect(
      screen.getByRole("link", { name: "Exportar Excel" }).getAttribute("href"),
    ).toBe("/api/students/export?search=Ana&status=active&page=2&pageSize=10");
  });

  it("hides mutating and export actions for assistants", async () => {
    requireOperationalMembership.mockResolvedValue({
      tenantId: "tenant-1",
      role: "assistant",
    });

    render(
      await StudentsPage({
        searchParams: Promise.resolve({}),
      }),
    );

    expect(screen.queryByRole("link", { name: "Exportar Excel" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Editar Ana Bravo" })).toBeNull();
    expect(
      screen.queryByRole("button", { name: /Eliminar Ana Bravo/ }),
    ).toBeNull();
  });
});
