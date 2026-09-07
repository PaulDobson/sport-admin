import {
  cleanup,
  fireEvent,
  render,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ConsentForm,
  ErasureRequestForm,
  MembershipForm,
  PersonalDataCorrectionForm,
  RestrictionForm,
} from "./student-detail-forms";
import {
  activateMembershipAction,
  correctPersonalDataAction,
  createRestrictionAction,
  registerConsentAction,
  requestErasureAction,
} from "./actions";

vi.mock("./actions", () => ({
  activateMembershipAction: vi.fn(),
  createRestrictionAction: vi.fn(),
  correctPersonalDataAction: vi.fn(),
  registerConsentAction: vi.fn(),
  requestErasureAction: vi.fn(),
}));

const studentId = "905fd6fc-9f10-4cf7-8aee-b9f187f2f3d1";

beforeEach(() => {
  vi.mocked(activateMembershipAction).mockReset();
  vi.mocked(createRestrictionAction).mockReset();
  vi.mocked(correctPersonalDataAction).mockReset();
  vi.mocked(registerConsentAction).mockReset();
  vi.mocked(requestErasureAction).mockReset();
});

afterEach(cleanup);

describe("mobile student health and finance flow", () => {
  it("registers an operational health alert from the student view", async () => {
    vi.mocked(createRestrictionAction).mockResolvedValue({
      error: null,
      saved: true,
    });
    const { container } = render(
      <RestrictionForm studentId={studentId} startsOn="2026-08-23" />,
    );
    const form = within(container);

    fireEvent.change(form.getByLabelText("Nivel"), {
      target: { value: "red" },
    });
    fireEvent.change(form.getByLabelText("Motivo"), {
      target: { value: "Dolor de rodilla" },
    });
    fireEvent.change(form.getByLabelText("Acción operativa"), {
      target: { value: "Evitar saltos" },
    });
    fireEvent.submit(
      form.getByRole("button", { name: "Guardar alerta" }).closest("form")!,
    );

    await waitFor(() => expect(createRestrictionAction).toHaveBeenCalledOnce());
    const submitted = vi.mocked(createRestrictionAction).mock.calls[0][1];
    expect(Object.fromEntries(submitted.entries())).toMatchObject({
      studentId,
      severity: "red",
      description: "Dolor de rodilla",
      operationalAction: "Evitar saltos",
      startsOn: "2026-08-23",
    });
    expect((await form.findByRole("status")).textContent).toContain(
      "Guardado.",
    );
  });

  it("assigns a financial membership from the same student view", async () => {
    vi.mocked(activateMembershipAction).mockResolvedValue({
      error: null,
      saved: true,
    });
    const planId = "da96aa28-c34d-4fc6-a972-f47ec3effb50";
    const { container } = render(
      <MembershipForm
        studentId={studentId}
        startsOn="2026-08-23"
        plans={[
          {
            id: planId,
            tenantId: "c84d5db9-bc46-4f45-aa31-d16e77327c01",
            name: "Mensual",
            price: 80,
            currency: "USD",
            billingCycle: "monthly",
            expirationGraceDays: 5,
            benefits: [],
            status: "active" as const,
          },
        ]}
      />,
    );
    const form = within(container);

    fireEvent.change(form.getByLabelText("Plan"), {
      target: { value: planId },
    });
    fireEvent.submit(
      form.getByRole("button", { name: "Asignar membresía" }).closest("form")!,
    );

    await waitFor(() =>
      expect(activateMembershipAction).toHaveBeenCalledOnce(),
    );
    const submitted = vi.mocked(activateMembershipAction).mock.calls[0][1];
    expect(Object.fromEntries(submitted.entries())).toMatchObject({
      studentId,
      planId,
      startsOn: "2026-08-23",
    });
    expect((await form.findByRole("status")).textContent).toContain(
      "Guardado.",
    );
  });

  it("records represented consent only with explicit confirmation", async () => {
    vi.mocked(registerConsentAction).mockResolvedValue({
      error: null,
      saved: true,
    });
    const { container } = render(
      <ConsentForm
        studentId={studentId}
        policyVersion="UY-2026-01"
        hasCurrentConsent={false}
      />,
    );
    const form = within(container);

    fireEvent.click(form.getByRole("checkbox"));
    fireEvent.submit(
      form
        .getByRole("button", { name: "Registrar consentimiento" })
        .closest("form")!,
    );

    await waitFor(() => expect(registerConsentAction).toHaveBeenCalledOnce());
    const submitted = vi.mocked(registerConsentAction).mock.calls[0][1];
    expect(Object.fromEntries(submitted.entries())).toMatchObject({
      studentId,
      policyVersion: "UY-2026-01",
      decision: "granted",
      representedConsentConfirmed: "confirmed",
    });
  });

  it("submits personal data corrections through the audited action", async () => {
    vi.mocked(correctPersonalDataAction).mockResolvedValue({
      error: null,
      saved: true,
    });
    const { container } = render(
      <PersonalDataCorrectionForm
        studentId={studentId}
        fullName="Ana Pérez"
        birthDate="2001-04-12"
      />,
    );
    const form = within(container);

    fireEvent.change(form.getByLabelText("Nombre completo"), {
      target: { value: "Ana Pereira" },
    });
    fireEvent.submit(
      form.getByRole("button", { name: "Corregir datos" }).closest("form")!,
    );

    await waitFor(() =>
      expect(correctPersonalDataAction).toHaveBeenCalledOnce(),
    );
    const submitted = vi.mocked(correctPersonalDataAction).mock.calls[0][1];
    expect(Object.fromEntries(submitted.entries())).toMatchObject({
      studentId,
      fullName: "Ana Pereira",
      birthDate: "2001-04-12",
    });
  });

  it("creates a subject erasure request instead of deleting directly", async () => {
    vi.mocked(requestErasureAction).mockResolvedValue({
      error: null,
      saved: true,
    });
    const { container } = render(<ErasureRequestForm studentId={studentId} />);
    const form = within(container);

    fireEvent.submit(
      form
        .getByRole("button", { name: "Solicitar eliminación" })
        .closest("form")!,
    );

    await waitFor(() => expect(requestErasureAction).toHaveBeenCalledOnce());
    const submitted = vi.mocked(requestErasureAction).mock.calls[0][1];
    expect(Object.fromEntries(submitted.entries())).toEqual({
      studentId,
      reason: "subject_request",
    });
  });
});
