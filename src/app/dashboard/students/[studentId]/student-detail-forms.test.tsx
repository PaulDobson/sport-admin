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
  PersonalDataCorrectionForm,
  RestrictionForm,
} from "./student-detail-forms";
import {
  correctPersonalDataAction,
  createRestrictionAction,
  registerConsentAction,
  requestErasureAction,
} from "./actions";

vi.mock("./actions", () => ({
  createRestrictionAction: vi.fn(),
  correctPersonalDataAction: vi.fn(),
  registerConsentAction: vi.fn(),
  requestErasureAction: vi.fn(),
}));

const studentId = "905fd6fc-9f10-4cf7-8aee-b9f187f2f3d1";

beforeEach(() => {
  vi.mocked(createRestrictionAction).mockReset();
  vi.mocked(correctPersonalDataAction).mockReset();
  vi.mocked(registerConsentAction).mockReset();
  vi.mocked(requestErasureAction).mockReset();
});

afterEach(cleanup);

describe("mobile student health and privacy flow", () => {
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
