import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ScheduleProgrammingPage from "./page";
import type { DisciplineOption } from "@/application/instructor-operations/ports/schedule-catalog-port";

const membership = vi.fn();
const deps = vi.fn();
vi.mock("@/app/_lib/operational-context", () => ({
  requireOperationalMembership: () => membership(),
}));
vi.mock("@/infrastructure/composition/instructor-scheduling-composition", () => ({
  createInstructorSchedulingDeps: () => deps(),
}));
vi.mock("next/navigation", () => ({
  redirect: (path: string) => { throw new Error(`redirect:${path}`); },
}));
vi.mock("../programming-workspace", () => ({
  ProgrammingWorkspace: ({ disciplines }: { disciplines: DisciplineOption[] }) => (
    <div>Formularios de programación
      {disciplines.map((discipline) => <span key={discipline.id}>{discipline.name}</span>)}
    </div>
  ),
}));
afterEach(cleanup);
beforeEach(() => {
  vi.clearAllMocks();
  membership.mockResolvedValue({ tenantId: "tenant-1", role: "instructor" });
  deps.mockResolvedValue({ classes: { list: vi.fn().mockResolvedValue([]) }, catalog: {
    listActiveDisciplines: vi.fn().mockResolvedValue([{ id: "discipline-1", name: "Yoga" }]),
    listActiveTemplates: vi.fn().mockResolvedValue([]),
    listActiveSchedules: vi.fn().mockResolvedValue([]),
    listActiveLocations: vi.fn().mockResolvedValue([]),
  } });
});

describe("ScheduleProgrammingPage", () => {
  it("renders the shared programming navigation and queries the active tenant", async () => {
    render(await ScheduleProgrammingPage());
    expect(screen.getByRole("link", { name: "Programación" }).getAttribute("aria-current")).toBe("page");
    expect(screen.getByRole("link", { name: "Sesiones" })).toBeTruthy();
    const { catalog, classes } = await deps.mock.results[0].value;
    expect(classes.list).toHaveBeenCalledWith("tenant-1");
    expect(catalog.listActiveSchedules).toHaveBeenCalledWith("tenant-1");
    expect(catalog.listActiveLocations).toHaveBeenCalledWith("tenant-1");
    expect(catalog.listActiveDisciplines).toHaveBeenCalledWith("tenant-1");
    expect(screen.getByText("Yoga")).toBeTruthy();
  });

  it("redirects assistants before querying the catalog", async () => {
    membership.mockResolvedValue({ tenantId: "tenant-1", role: "assistant" });
    await expect(ScheduleProgrammingPage()).rejects.toThrow("redirect:/dashboard/schedule");
    expect(deps).not.toHaveBeenCalled();
  });
});
