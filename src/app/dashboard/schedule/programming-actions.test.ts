import { beforeEach, describe, expect, it, vi } from "vitest";
import { createClassTemplateAction, createDisciplineAction, createLocationAction, previewProgrammingAction, saveProgrammingAction, saveClassTemplateAction } from "./programming-actions";
import { ConflictError } from "@/domain/shared/errors";

const mocks = vi.hoisted(() => ({
  membership: vi.fn(),
  composition: vi.fn(),
  find: vi.fn(),
  create: vi.fn(),
  createDiscipline: vi.fn(),
  revalidate: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  rethrow: vi.fn(),
  batch: vi.fn(),
  location: vi.fn(),
}));
vi.mock("@/app/_lib/operational-context", () => ({ requireOperationalMembership: mocks.membership }));
vi.mock("@/infrastructure/composition/instructor-scheduling-composition", () => ({ createInstructorSchedulingDeps: mocks.composition }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
vi.mock("next/navigation", () => ({ unstable_rethrow: mocks.rethrow }));
const tenantId = "11111111-1111-4111-8111-111111111111";
const disciplineId = "22222222-2222-4222-8222-222222222222";
const previous = { error: null, message: null };
function form() {
  const data = new FormData();
  data.set("disciplineId", disciplineId);
  data.set("disciplineName", "Must not create a discipline");
  data.set("tenantId", "forged-tenant");
  data.set("className", " Yoga inicial ");
  data.set("capacity", "16");
  return data;
}
beforeEach(() => {
  vi.clearAllMocks();
  mocks.membership.mockResolvedValue({ id: "44444444-4444-4444-8444-444444444444", tenantId, role: "instructor" });
  mocks.composition.mockResolvedValue({
    classes: { update: mocks.update, delete: mocks.delete },
    catalog: { findActiveDiscipline: mocks.find },
    schedules: { createClassTemplate: mocks.create, createDiscipline: mocks.createDiscipline },
    programming: { execute: mocks.batch },
    locations: { create: mocks.location },
  });
  mocks.find.mockResolvedValue({ id: disciplineId });
  mocks.create.mockResolvedValue({ id: disciplineId, name: "Yoga inicial" });
});

describe("class administration actions", () => {
  const id = "33333333-3333-4333-8333-333333333333";
  function administrationForm(operation: string) {
    const data = form();
    data.set("operation", operation);
    data.set("id", id);
    return data;
  }
  it("updates only name and capacity with trusted tenant context", async () => {
    expect((await saveClassTemplateAction(previous, administrationForm("update"))).error).toBeNull();
    expect(mocks.update).toHaveBeenCalledWith({ tenantId, id, name: "Yoga inicial", capacity: 16 });
    expect(mocks.revalidate).toHaveBeenCalledWith("/dashboard", "layout");
    expect(mocks.revalidate).toHaveBeenCalledWith("/portal", "layout");
    expect(mocks.revalidate).toHaveBeenCalledWith("/dashboard/disciplines");
  });
  it("deletes the class without deleting schedules or sessions in application code", async () => {
    expect(await saveClassTemplateAction(previous, administrationForm("delete"))).toEqual({ error: null, message: "Clase eliminada." });
    expect(mocks.delete).toHaveBeenCalledWith({ tenantId, id });
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it.each(["update", "delete"])("rejects assistants before constructing repositories for %s", async (operation) => {
    mocks.membership.mockResolvedValueOnce({ tenantId, role: "assistant" });
    expect((await saveClassTemplateAction(previous, administrationForm(operation))).error).toContain("Tu perfil");
    expect(mocks.composition).not.toHaveBeenCalled();
    expect(mocks.revalidate).not.toHaveBeenCalled();
  });
  it("validates inputs without trusting submitted discipline or capacity limits", async () => {
    const data = administrationForm("update");
    data.set("capacity", "501");
    expect((await saveClassTemplateAction(previous, data)).error).toContain("500");
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.revalidate).not.toHaveBeenCalled();
  });
  it("rejects unsupported operations", async () => {
    expect((await saveClassTemplateAction(previous, administrationForm("archive"))).error).toContain("no está disponible");
    expect(mocks.composition).not.toHaveBeenCalled();
  });
  it("preserves framework control flow", async () => {
    const redirect = new Error("redirect");
    mocks.membership.mockRejectedValueOnce(redirect);
    mocks.rethrow.mockImplementationOnce((error) => { throw error; });
    await expect(saveClassTemplateAction(previous, administrationForm("delete"))).rejects.toBe(redirect);
  });
  it("returns reference conflicts without reporting success or invalidating pages", async () => {
    mocks.delete.mockRejectedValueOnce(new ConflictError("La clase tiene horarios asociados."));
    expect(await saveClassTemplateAction(previous, administrationForm("delete"))).toEqual({ error: "La clase tiene horarios asociados.", message: null });
    expect(mocks.revalidate).not.toHaveBeenCalled();
  });
});
describe("class template action", () => {
  it("submits the selected ID with trusted tenant context without creating disciplines", async () => {
    expect(await createClassTemplateAction(previous, form())).toEqual({ error: null, message: "Plantilla de clase creada.", created: { id: disciplineId, name: "Yoga inicial" } });
    expect(mocks.find).toHaveBeenCalledWith(tenantId, disciplineId);
    expect(mocks.create).toHaveBeenCalledWith({ tenantId, disciplineId, name: "Yoga inicial", capacity: 16 });
    expect(mocks.createDiscipline).not.toHaveBeenCalled();
    expect(mocks.revalidate).toHaveBeenCalledWith("/dashboard/disciplines");
  });

  describe("programming batches", () => {
    const payload = {
      operationId: "55555555-5555-4555-8555-555555555555",
      classTemplateId: disciplineId, timezone: "America/Santiago", mode: "weekly",
      fromDate: "2030-01-07", throughDate: "2030-01-14", waitlistEnabled: true, allowConflict: false,
      slots: [{ dayOfWeek: 1, startsAt: "09:00", endsAt: "10:00", locationId: disciplineId }],
    };
    const preview = { newCount: 2, existingCount: 0, occurrences: [], conflicts: [], fingerprint: "review" };
    function batchForm(input: unknown = payload, intent = "publish") {
      const data = new FormData();
      data.set("programming", JSON.stringify(input));
      data.set("intent", intent);
      data.set("tenantId", "forged");
      return data;
    }
    it("previews with trusted tenant/instructor and no cache invalidation", async () => {
      mocks.batch.mockResolvedValueOnce(preview);
      expect(await previewProgrammingAction(previous, batchForm())).toEqual({ error: null, message: null, preview });
      expect(mocks.batch).toHaveBeenCalledWith(expect.objectContaining({
        tenantId, instructorMembershipId: "44444444-4444-4444-8444-444444444444", commit: false, intent: "publish", programming: payload,
      }));
      expect(mocks.revalidate).not.toHaveBeenCalled();
    });
    it("requires a previous review before committing", async () => {
      expect((await saveProgrammingAction(previous, batchForm())).error).toContain("Revisa");
      expect(mocks.batch).not.toHaveBeenCalled();
    });
    it("passes the review fingerprint and explicit confirmation to the transactional port", async () => {
      mocks.batch.mockResolvedValueOnce(preview);
      expect((await saveProgrammingAction({ ...previous, preview }, batchForm({ ...payload, allowConflict: true }))).message).toContain("2 sesiones nuevas");
      expect(mocks.batch).toHaveBeenCalledWith(expect.objectContaining({ commit: true, previewFingerprint: "review", programming: { ...payload, allowConflict: true } }));
      expect(mocks.revalidate).toHaveBeenCalledWith("/portal", "layout");
    });
    it("accepts the review fingerprint sent by the wizard when the save state has no preview", async () => {
      mocks.batch.mockResolvedValueOnce(preview);
      const data = batchForm();
      data.set("previewFingerprint", "review");
      expect((await saveProgrammingAction(previous, data)).error).toBeNull();
      expect(mocks.batch).toHaveBeenCalledWith(expect.objectContaining({ commit: true, previewFingerprint: "review" }));
    });
    it("passes an explicit instructor scope to RPC authorization without reassigning it", async () => {
      mocks.batch.mockResolvedValueOnce(preview);
      await previewProgrammingAction(previous, batchForm({ ...payload, instructorMembershipId: disciplineId }));
      expect(mocks.batch).toHaveBeenCalledWith(expect.objectContaining({ instructorMembershipId: disciplineId }));
    });
    it.each([
      { ...payload, fromDate: "2030-02-30" },
      { ...payload, throughDate: "2031-01-01" },
      { ...payload, timezone: "Not/AZone" },
      { ...payload, slots: [{ ...payload.slots[0], startsAt: "25:00" }] },
      { ...payload, slots: Array.from({ length: 29 }, () => payload.slots[0]) },
      { ...payload, mode: "once" },
    ])("rejects invalid batches before RPC", async (input) => {
      expect((await previewProgrammingAction(previous, batchForm(input))).error).toBeTruthy();
      expect(mocks.batch).not.toHaveBeenCalled();
    });
    it("does not allow a one-off to be saved as a recurring rule", async () => {
      const input = { ...payload, mode: "once", slots: [{ ...payload.slots[0], date: "2030-01-07", endDate: "2030-01-07" }] };
      expect((await previewProgrammingAction(previous, batchForm(input, "save"))).error).toContain("semanales");
      expect(mocks.batch).not.toHaveBeenCalled();
    });
    it("allows a valid overnight one-off publication", async () => {
      mocks.batch.mockResolvedValueOnce(preview);
      const input = { ...payload, mode: "once", slots: [{ ...payload.slots[0], startsAt: "23:00", endsAt: "01:00", date: "2030-01-07", endDate: "2030-01-08" }] };
      expect((await previewProgrammingAction(previous, batchForm(input))).error).toBeNull();
    });
    it("returns malformed JSON as an actionable error", async () => {
      const data = batchForm(); data.set("programming", "{");
      expect((await previewProgrammingAction(previous, data)).error).toContain("no es válida");
      expect(mocks.batch).not.toHaveBeenCalled();
    });
    it("denies assistants before constructing repositories", async () => {
      mocks.membership.mockResolvedValueOnce({ tenantId, role: "assistant" });
      expect((await previewProgrammingAction(previous, batchForm())).error).toContain("Tu perfil");
      expect(mocks.composition).not.toHaveBeenCalled();
    });
    it("does not invalidate paths after a transactional rejection", async () => {
      mocks.batch.mockRejectedValueOnce(new ConflictError("Revisa los cruces."));
      expect((await saveProgrammingAction({ ...previous, preview }, batchForm())).error).toBe("Revisa los cruces.");
      expect(mocks.revalidate).not.toHaveBeenCalled();
    });
  });

  describe("contextual catalog creation", () => {
    it("creates a discipline with existing use case and returns the selectable item", async () => {
      mocks.createDiscipline.mockResolvedValueOnce({ id: disciplineId, name: "Yoga" });
      const data = new FormData(); data.set("name", " Yoga ");
      expect((await createDisciplineAction(previous, data)).created).toEqual({ id: disciplineId, name: "Yoga" });
      expect(mocks.createDiscipline).toHaveBeenCalledWith({ tenantId, name: "Yoga" });
    });
    it("accepts a valid external gym without inventing an own_gym enum", async () => {
      mocks.location.mockResolvedValueOnce({ id: disciplineId, name: "Gimnasio" });
      const data = new FormData(); data.set("name", "Gimnasio"); data.set("type", "external_gym");
      expect((await createLocationAction(previous, data)).created).toEqual({ id: disciplineId, name: "Gimnasio" });
      expect(mocks.location).toHaveBeenCalledWith({ tenantId, name: "Gimnasio", type: "external_gym", address: null });
      data.set("type", "own_gym");
      expect((await createLocationAction(previous, data)).error).toBeTruthy();
    });
  });
  it("rejects stale or inaccessible selections", async () => {
    mocks.find.mockResolvedValueOnce(null);
    const result = await createClassTemplateAction(previous, form());
    expect(result.error).toContain("ya no está activa");
    expect(result.message).toBeNull();
    expect(mocks.create).not.toHaveBeenCalled();
    expect(mocks.createDiscipline).not.toHaveBeenCalled();
    expect(mocks.revalidate).not.toHaveBeenCalled();
  });
  it("requires an ID, not a legacy free-text discipline name", async () => {
    const data = form();
    data.delete("disciplineId");
    expect((await createClassTemplateAction(previous, data)).error).toBe("Selecciona una disciplina válida.");
    expect(mocks.find).not.toHaveBeenCalled();
    expect(mocks.createDiscipline).not.toHaveBeenCalled();
  });
});
