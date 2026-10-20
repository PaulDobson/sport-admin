import { beforeEach, describe, expect, it, vi } from "vitest";
import { createDiscipline } from "./create-discipline";
import { deleteDiscipline, listDisciplines, updateDiscipline } from "./manage-disciplines";
import { ValidationError } from "@/domain/shared/errors";
import type { DisciplineAdministrationPort } from "../ports/discipline-administration-port";

const tenantId = "11111111-1111-4111-8111-111111111111";
const id = "22222222-2222-4222-8222-222222222222";
const disciplines: DisciplineAdministrationPort = {
  createDiscipline: vi.fn(),
  list: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
};
const deps = { disciplines };

beforeEach(() => vi.clearAllMocks());

describe("discipline administration validation", () => {
  it("trims names when creating and editing", async () => {
    await createDiscipline({ tenantId, name: " Yoga " }, { schedules: disciplines });
    expect(disciplines.createDiscipline).toHaveBeenCalledWith({ tenantId, name: "Yoga" });
    await updateDiscipline({ tenantId, id, name: " Pilates ", status: "archived" }, deps);
    expect(disciplines.update).toHaveBeenCalledWith({ tenantId, id, name: "Pilates", status: "archived" });
  });

  it("rejects whitespace-only names", async () => {
    await expect(createDiscipline({ tenantId, name: "  " }, { schedules: disciplines })).rejects.toBeInstanceOf(ValidationError);
    expect(() => updateDiscipline({ tenantId, id, name: " ", status: "active" }, deps)).toThrow(ValidationError);
    expect(disciplines.createDiscipline).not.toHaveBeenCalled();
    expect(disciplines.update).not.toHaveBeenCalled();
  });

  it("rejects invalid status, identity and pagination before persistence", () => {
    expect(() => updateDiscipline({ tenantId, id, name: "Yoga", status: "deleted" }, deps)).toThrow(ValidationError);
    expect(() => deleteDiscipline({ tenantId, id: "invalid" }, deps)).toThrow(ValidationError);
    expect(() => listDisciplines({ tenantId, page: 0, pageSize: 100, search: "", status: "all" }, deps)).toThrow(ValidationError);
    expect(disciplines.delete).not.toHaveBeenCalled();
    expect(disciplines.list).not.toHaveBeenCalled();
  });

  it("supports reactivation and tenant-scoped deletion", async () => {
    await updateDiscipline({ tenantId, id, name: "Yoga", status: "active" }, deps);
    await deleteDiscipline({ tenantId, id }, deps);
    expect(disciplines.update).toHaveBeenCalledWith({ tenantId, id, name: "Yoga", status: "active" });
    expect(disciplines.delete).toHaveBeenCalledWith({ tenantId, id });
  });
});
