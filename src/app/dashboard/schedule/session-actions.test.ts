import { beforeEach, describe, expect, it, vi } from "vitest";
import { maintainSessionAction } from "./session-actions";

const mocks = vi.hoisted(() => ({
  membership: vi.fn(),
  composition: vi.fn(),
  update: vi.fn(),
  revalidate: vi.fn(),
  rethrow: vi.fn(),
}));

vi.mock("@/app/_lib/operational-context", () => ({
  requireOperationalMembership: mocks.membership,
}));
vi.mock("@/infrastructure/composition/instructor-session-composition", () => ({
  createInstructorSessionDeps: mocks.composition,
}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
vi.mock("next/navigation", () => ({ unstable_rethrow: mocks.rethrow }));

const tenantId = "11111111-1111-4111-8111-111111111111";
const sessionId = "22222222-2222-4222-8222-222222222222";
const previous = { error: null, message: null };

function sessionForm(operation: string) {
  const form = new FormData();
  form.set("operation", operation);
  form.set("sessionId", sessionId);
  form.set("startsAtLocal", "2026-10-08T10:00");
  form.set("endsAtLocal", "2026-10-08T11:00");
  form.set("capacity", "18");
  return form;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.membership.mockResolvedValue({ tenantId, role: "instructor" });
  mocks.composition.mockResolvedValue({ sessions: { update: mocks.update } });
  mocks.update.mockResolvedValue({});
});

describe("maintainSessionAction", () => {
  it("updates session time and capacity in the operational timezone", async () => {
    const result = await maintainSessionAction(previous, sessionForm("update"));

    expect(result).toEqual({ error: null, message: "Cambios de la sesión guardados." });
    expect(mocks.update).toHaveBeenCalledWith({
      tenantId,
      sessionId,
      startsAt: new Date("2026-10-08T13:00:00.000Z"),
      endsAt: new Date("2026-10-08T14:00:00.000Z"),
      capacity: 18,
    });
    expect(mocks.revalidate).toHaveBeenCalledWith("/dashboard", "layout");
    expect(mocks.revalidate).toHaveBeenCalledWith("/portal", "layout");
  });

  it("cancels without deleting the session or its enrollment records", async () => {
    const result = await maintainSessionAction(previous, sessionForm("cancel"));

    expect(result.message).toContain("registro y las reservas se conservaron");
    expect(mocks.update).toHaveBeenCalledWith({
      tenantId,
      sessionId,
      status: "cancelled",
    });
  });

  it("reactivates a cancelled session", async () => {
    const result = await maintainSessionAction(previous, sessionForm("reactivate"));

    expect(result).toEqual({ error: null, message: "Sesión reactivada." });
    expect(mocks.update).toHaveBeenCalledWith({
      tenantId,
      sessionId,
      status: "scheduled",
    });
  });

  it("rejects assistants before constructing a repository", async () => {
    mocks.membership.mockResolvedValueOnce({ tenantId, role: "assistant" });

    const result = await maintainSessionAction(previous, sessionForm("cancel"));

    expect(result.error).toContain("Tu perfil no puede modificar");
    expect(mocks.composition).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("returns a validation error for a nonexistent local time", async () => {
    const form = sessionForm("update");
    form.set("startsAtLocal", "2026-02-30T10:00");

    const result = await maintainSessionAction(previous, form);

    expect(result.error).toBe("Ingresa una fecha y hora válidas.");
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.revalidate).not.toHaveBeenCalled();
  });

  it("rejects an end time before the start time", async () => {
    const form = sessionForm("update");
    form.set("endsAtLocal", "2026-10-08T09:00");

    const result = await maintainSessionAction(previous, form);

    expect(result.error).toBe("La hora de término debe ser posterior al inicio.");
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("explains when a capacity change conflicts with confirmed enrollments", async () => {
    mocks.update.mockRejectedValueOnce({
      code: "23514",
      message: "session capacity cannot be lower than confirmed enrollments",
    });

    const result = await maintainSessionAction(previous, sessionForm("update"));

    expect(result.error).toBe(
      "Los cupos no pueden ser inferiores a los alumnos confirmados.",
    );
    expect(result.message).toBeNull();
    expect(mocks.revalidate).not.toHaveBeenCalled();
  });
});
