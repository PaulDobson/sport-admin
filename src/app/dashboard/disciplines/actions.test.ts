import { beforeEach, describe, expect, it, vi } from "vitest";
import { ConflictError } from "@/domain/shared/errors";
import { saveDisciplineAction } from "./actions";

const mocks = vi.hoisted(() => ({
  membership: vi.fn(),
  composition: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  revalidate: vi.fn(),
}));
vi.mock("@/app/_lib/operational-context", () => ({ requireOperationalMembership: mocks.membership }));
vi.mock("@/infrastructure/composition/discipline-administration-composition", () => ({ createDisciplineAdministrationDeps: mocks.composition }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
vi.mock("next/navigation", () => ({ unstable_rethrow: (error: unknown) => {
  if (error instanceof Error && error.message === "NEXT_REDIRECT") throw error;
} }));

const tenantId = "11111111-1111-4111-8111-111111111111";
const id = "22222222-2222-4222-8222-222222222222";
const previous = { error: null, message: null };
function form(operation: string) {
  const data = new FormData();
  data.set("operation", operation);
  data.set("id", id);
  data.set("tenantId", "attacker-controlled-tenant");
  data.set("name", " Yoga ");
  data.set("status", "archived");
  return data;
}
beforeEach(() => {
  vi.clearAllMocks();
  mocks.membership.mockResolvedValue({ tenantId, role: "owner" });
  mocks.composition.mockResolvedValue({ disciplines: { createDiscipline: mocks.create, update: mocks.update, delete: mocks.delete } });
  mocks.create.mockResolvedValue({});
  mocks.update.mockResolvedValue({});
  mocks.delete.mockResolvedValue(undefined);
});

describe("discipline server action", () => {
  it.each(["owner", "admin", "instructor"])("allows %s to create using trusted tenant context", async (role) => {
    mocks.membership.mockResolvedValue({ tenantId, role });
    expect(await saveDisciplineAction(previous, form("create"))).toEqual({ error: null, message: "Disciplina creada." });
    expect(mocks.create).toHaveBeenCalledWith({ tenantId, name: "Yoga" });
    expect(mocks.revalidate).toHaveBeenCalledWith("/dashboard/disciplines");
    expect(mocks.revalidate).toHaveBeenCalledWith("/dashboard/schedule/programming");
  });
  it.each(["create", "update", "delete"])("denies assistant %s mutations before composition", async (operation) => {
    mocks.membership.mockResolvedValue({ tenantId, role: "assistant" });
    expect(await saveDisciplineAction(previous, form(operation))).toEqual({ error: "Tu perfil solo puede consultar disciplinas.", message: null });
    expect(mocks.composition).not.toHaveBeenCalled();
  });
  it("updates the name and state and deletes using tenant scope", async () => {
    await saveDisciplineAction(previous, form("update"));
    expect(mocks.update).toHaveBeenCalledWith({ tenantId, id, name: "Yoga", status: "archived" });
    await saveDisciplineAction(previous, form("delete"));
    expect(mocks.delete).toHaveBeenCalledWith({ tenantId, id });
  });
  it("returns actionable conflicts without invalidating views", async () => {
    mocks.delete.mockRejectedValueOnce(new ConflictError("Tiene clases asociadas."));
    expect(await saveDisciplineAction(previous, form("delete"))).toEqual({ error: "Tiene clases asociadas.", message: null });
    expect(mocks.revalidate).not.toHaveBeenCalled();
  });
  it("rejects forged operations and invalid state", async () => {
    expect((await saveDisciplineAction(previous, form("other"))).error).toBe("La acción solicitada no es válida.");
    const data = form("update");
    data.set("status", "deleted");
    expect((await saveDisciplineAction(previous, data)).error).toBe("Selecciona un estado válido.");
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it("preserves Next authentication redirects", async () => {
    mocks.membership.mockRejectedValueOnce(new Error("NEXT_REDIRECT"));
    await expect(saveDisciplineAction(previous, form("create"))).rejects.toThrow("NEXT_REDIRECT");
  });
});
