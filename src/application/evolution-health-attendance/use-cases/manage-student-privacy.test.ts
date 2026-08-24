import { describe, expect, it, vi } from "vitest";
import { ValidationError } from "@/domain/shared/errors";
import type { PrivacyRepositoryPort } from "../ports/privacy-repository-port";
import {
  correctStudentPersonalData,
  exportStudentPersonalData,
  getStudentPrivacyState,
  registerStudentHealthConsent,
  requestStudentErasure,
} from "./manage-student-privacy";

const ids = {
  tenantId: "30000000-0000-4000-8000-000000000001",
  studentId: "30000000-0000-4000-8000-000000000002",
};

function createPrivacyRepository(): PrivacyRepositoryPort {
  return {
    getStudentState: vi.fn().mockResolvedValue({
      policyApproved: true,
      healthEnabled: true,
      policyVersion: "2026-01",
      hasCurrentConsent: false,
    }),
    registerConsent: vi.fn().mockResolvedValue("consent-id"),
    exportPersonalData: vi
      .fn()
      .mockResolvedValue({ student: { id: ids.studentId } }),
    correctPersonalData: vi.fn().mockResolvedValue(undefined),
    requestErasure: vi.fn().mockResolvedValue("request-id"),
  };
}

describe("student privacy governance", () => {
  it("delegates status, consent, export and erasure through the privacy port", async () => {
    const privacy = createPrivacyRepository();
    const operationId = "30000000-0000-4000-8000-000000000003";

    await getStudentPrivacyState(ids, { privacy });
    await registerStudentHealthConsent(
      {
        ...ids,
        policyVersion: " 2026-01 ",
        decision: "granted",
        operationId,
        representedConsentConfirmed: true,
      },
      { privacy },
    );
    await exportStudentPersonalData(ids, { privacy });
    await requestStudentErasure(
      { ...ids, reason: "subject_request" },
      { privacy },
    );

    expect(privacy.getStudentState).toHaveBeenCalledWith(
      ids.tenantId,
      ids.studentId,
    );
    expect(privacy.registerConsent).toHaveBeenCalledWith({
      ...ids,
      policyVersion: "2026-01",
      decision: "granted",
      operationId,
    });
    expect(privacy.exportPersonalData).toHaveBeenCalledWith(
      ids.tenantId,
      ids.studentId,
    );
    expect(privacy.requestErasure).toHaveBeenCalledWith({
      ...ids,
      reason: "subject_request",
    });
  });

  it("rejects represented consent without explicit confirmation", () => {
    const privacy = createPrivacyRepository();

    expect(() =>
      registerStudentHealthConsent(
        {
          ...ids,
          policyVersion: "2026-01",
          decision: "granted",
          operationId: "30000000-0000-4000-8000-000000000003",
          representedConsentConfirmed: false,
        },
        { privacy },
      ),
    ).toThrow(ValidationError);
    expect(privacy.registerConsent).not.toHaveBeenCalled();
  });

  it("requires at least one valid correction field", async () => {
    const privacy = createPrivacyRepository();

    expect(() => correctStudentPersonalData({ ...ids }, { privacy })).toThrow(
      ValidationError,
    );
    expect(privacy.correctPersonalData).not.toHaveBeenCalled();
  });

  it("normalizes correction values before persistence", async () => {
    const privacy = createPrivacyRepository();

    await correctStudentPersonalData(
      { ...ids, fullName: "  Ana Pérez  ", birthDate: "2001-04-12" },
      { privacy },
    );

    expect(privacy.correctPersonalData).toHaveBeenCalledWith({
      ...ids,
      fullName: "Ana Pérez",
      birthDate: "2001-04-12",
    });
  });
});
