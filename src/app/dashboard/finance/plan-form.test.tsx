import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { MembershipPlan } from "@/domain/instructor-finance/membership";
import { PlanForm } from "./plan-form";

vi.mock("./actions", () => ({
  createPlanAction: vi.fn(async () => ({ error: null, saved: true })),
  updatePlanAction: vi.fn(async () => ({ error: null, saved: true })),
}));

afterEach(cleanup);

function preview() {
  return within(screen.getByRole("article", { name: "Vista previa del plan" }));
}

function hidden(form: HTMLFormElement, name: string) {
  return new FormData(form).get(name);
}

const existingPlan: MembershipPlan = {
  id: "6c4a4b2c-2f0e-4a7c-9a24-0f3f0f6e1d21",
  tenantId: "0e2f8e5d-1a54-4f42-9e51-6f36f3f2a111",
  name: "Mensual Adulto",
  price: 45000,
  currency: "CLP",
  billingCycle: "monthly",
  expirationGraceDays: 5,
  benefits: ["2 clases semanales"],
  status: "active",
  membershipCount: 3,
};

describe("guided plan form", () => {
  it("applies a template to cycle, grace days and benefits and mirrors it in the preview", () => {
    render(<PlanForm />);

    fireEvent.click(screen.getByRole("button", { name: /Trimestral/ }));

    expect(
      (screen.getByLabelText("Nombre") as HTMLInputElement).value,
    ).toBe("Plan trimestral");
    expect(
      (screen.getByRole("radio", { name: "Trimestral" }) as HTMLInputElement)
        .checked,
    ).toBe(true);
    expect(
      (screen.getByLabelText("Días de tolerancia") as HTMLInputElement).value,
    ).toBe("7");
    expect(preview().getByText("Plan trimestral")).toBeTruthy();
    expect(preview().getByText(/gracia 7 días/)).toBeTruthy();
    expect(preview().getByText("Evaluación trimestral")).toBeTruthy();
  });

  it("shows the monthly equivalent for annual plans", () => {
    render(<PlanForm />);

    fireEvent.change(screen.getByLabelText("Precio"), {
      target: { value: "120000" },
    });
    fireEvent.click(screen.getByRole("radio", { name: "Anual" }));

    expect(screen.getByText(/Equivale a \$10\.000 al mes/)).toBeTruthy();
    expect(preview().getByText(/Equivale a \$10\.000/)).toBeTruthy();
  });

  it("adds and removes benefits as chips", () => {
    const { container } = render(<PlanForm />);
    const form = container.querySelector("form")!;

    fireEvent.change(screen.getByLabelText("Beneficios"), {
      target: { value: "Clases grupales" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Agregar" }));
    fireEvent.change(screen.getByLabelText("Beneficios"), {
      target: { value: "Rutina personalizada" },
    });
    fireEvent.keyDown(screen.getByLabelText("Beneficios"), { key: "Enter" });

    expect(hidden(form, "benefits")).toBe(
      "Clases grupales\nRutina personalizada",
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Quitar Clases grupales" }),
    );
    expect(hidden(form, "benefits")).toBe("Rutina personalizada");
  });

  it("blocks submission and focuses the first invalid field", () => {
    const { container } = render(<PlanForm />);
    const form = container.querySelector("form")!;
    // fireEvent returns false when a handler called preventDefault.
    expect(fireEvent.submit(form)).toBe(false);
    expect(screen.getByText("Ingresa un nombre para el plan.")).toBeTruthy();
    expect(screen.getByText("Ingresa el precio del plan.")).toBeTruthy();
    expect(document.activeElement).toBe(screen.getByLabelText("Nombre"));
  });

  it("submits the field names expected by the server actions", () => {
    const { container } = render(<PlanForm plan={existingPlan} />);
    const form = container.querySelector("form")!;

    const data = new FormData(form);
    expect(data.get("planId")).toBe(existingPlan.id);
    expect(data.get("name")).toBe("Mensual Adulto");
    expect(data.get("price")).toBe("45000");
    expect(data.get("currency")).toBe("CLP");
    expect(data.get("billingCycle")).toBe("monthly");
    expect(data.get("expirationGraceDays")).toBe("5");
    expect(data.get("benefits")).toBe("2 clases semanales");
    expect(
      screen.getByText(/3 membresías vigentes conservan su precio/),
    ).toBeTruthy();
  });
});
