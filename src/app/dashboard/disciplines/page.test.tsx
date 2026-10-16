import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import DisciplinesPage from "./page";

const mocks = vi.hoisted(() => ({ membership: vi.fn(), composition: vi.fn(), list: vi.fn() }));
vi.mock("@/app/_lib/operational-context", () => ({ requireOperationalMembership: mocks.membership }));
vi.mock("@/infrastructure/composition/discipline-administration-composition", () => ({ createDisciplineAdministrationDeps: mocks.composition }));
vi.mock("@/application/instructor-operations/use-cases/manage-disciplines", () => ({ listDisciplines: mocks.list }));
vi.mock("./actions", () => ({ saveDisciplineAction: vi.fn() }));
afterEach(cleanup);
beforeEach(() => {
  vi.clearAllMocks();
  mocks.membership.mockResolvedValue({ tenantId: "trusted-tenant", role: "owner" });
  mocks.composition.mockResolvedValue({ disciplines: {} });
  mocks.list.mockResolvedValue({ rows: [], total: 0, page: 1, pageSize: 10, activeCount: 0, archivedCount: 0 });
});
describe("discipline page", () => {
  it("normalizes query inputs and uses the authenticated tenant", async () => {
    render(await DisciplinesPage({ searchParams: Promise.resolve({ search: " Yoga ", status: "invalid", page: "-1", pageSize: "200" }) }));
    expect(mocks.list).toHaveBeenCalledWith({ tenantId: "trusted-tenant", search: "Yoga", status: "all", page: 1, pageSize: 50 }, { disciplines: {} });
    expect(screen.getByRole("link", { name: "Disciplinas" }).getAttribute("aria-current")).toBe("page");
  });
  it("renders read-only catalog for assistants", async () => {
    mocks.membership.mockResolvedValue({ tenantId: "trusted-tenant", role: "assistant" });
    render(await DisciplinesPage({ searchParams: Promise.resolve({}) }));
    expect(screen.queryByRole("button", { name: "Nueva disciplina" })).toBeNull();
    expect(screen.getByText(/Tu perfil puede consultar el catálogo/)).toBeTruthy();
  });
  it("propagates loading failures to the dashboard error boundary", async () => {
    mocks.list.mockRejectedValueOnce(new Error("Database unavailable"));
    await expect(DisciplinesPage({ searchParams: Promise.resolve({}) })).rejects.toThrow("Database unavailable");
  });
});
