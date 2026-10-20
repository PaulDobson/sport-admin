import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AssignablePlan } from "./actions";
import {
  assignMembershipAction,
  listAssignablePlansAction,
  searchAssignableStudentsAction,
} from "./actions";
import { AssignMembershipSheet } from "./assign-membership-sheet";

vi.mock("./actions", () => ({
  assignMembershipAction: vi.fn(),
  listAssignablePlansAction: vi.fn(),
  searchAssignableStudentsAction: vi.fn(),
  createPlanAction: vi.fn(async () => ({ error: null, saved: true })),
  updatePlanAction: vi.fn(),
}));

const monthly: AssignablePlan = {
  id: "plan-1",
  name: "Mensual Adulto",
  price: 30000,
  currency: "CLP",
  billingCycle: "monthly",
  expirationGraceDays: 5,
  benefits: ["Clases ilimitadas"],
};

const quarterly: AssignablePlan = {
  ...monthly,
  id: "plan-2",
  name: "Trimestral",
  price: 81000,
  billingCycle: "quarterly",
  benefits: [],
};

const ana = { id: "student-1", fullName: "Ana Pérez" };

beforeEach(() => {
  vi.mocked(searchAssignableStudentsAction).mockResolvedValue([
    { ...ana, photoUrl: null, hasCurrentMembership: false },
    {
      id: "student-2",
      fullName: "Bruno Díaz",
      photoUrl: null,
      hasCurrentMembership: true,
    },
  ]);
  vi.mocked(listAssignablePlansAction).mockResolvedValue([monthly, quarterly]);
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function dialog() {
  return within(screen.getByRole("dialog"));
}

function setStartsOn(value: string) {
  fireEvent.change(dialog().getByLabelText("Inicio"), { target: { value } });
}

describe("AssignMembershipSheet", () => {
  it("walks through student, plan and confirmation when nothing is known", async () => {
    vi.mocked(assignMembershipAction).mockResolvedValue({
      status: "assigned",
      error: null,
      result: {
        membershipId: "membership-1",
        studentId: ana.id,
        expiresOn: "2026-03-31",
        agreedPrice: 30000,
        currency: "CLP",
        paidAmount: 30000,
        balance: 0,
      },
    });
    render(<AssignMembershipSheet trigger="Asignar plan" />);

    fireEvent.click(screen.getByRole("button", { name: "Asignar plan" }));
    const steps = dialog().getByRole("list", {
      name: "Pasos de la asignación",
    });
    expect(within(steps).getAllByRole("listitem")).toHaveLength(3);

    const blocked = await dialog().findByText("Bruno Díaz");
    expect(
      within(blocked.closest("li")!)
        .getByRole("link", { name: "Ver membresía" })
        .getAttribute("href"),
    ).toBe("/dashboard/students/student-2?section=membership");
    expect(
      dialog().queryByRole("button", { name: /Bruno Díaz/ }),
    ).toBeNull();

    fireEvent.click(dialog().getByRole("button", { name: /Ana Pérez/ }));
    fireEvent.click(
      await dialog().findByRole("button", { name: /Trimestral/ }),
    );

    setStartsOn("2026-01-31");
    expect(dialog().getByText(/Próximo vencimiento: 29 abr 2026/)).toBeTruthy();
    expect(dialog().getByText("Saldo resultante")).toBeTruthy();

    fireEvent.click(
      dialog().getByRole("button", { name: "Asignar y registrar pago" }),
    );

    expect(await dialog().findByText("Plan asignado")).toBeTruthy();
    const formData = vi.mocked(assignMembershipAction).mock
      .calls[0][1] as FormData;
    expect(formData.get("studentId")).toBe(ana.id);
    expect(formData.get("planId")).toBe("plan-2");
    expect(formData.get("startsOn")).toBe("2026-01-31");
    expect(formData.get("withPayment")).toBe("on");
    expect(formData.get("amount")).toBe("81000");
    expect(formData.get("assignmentToken")).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("debounces the student search", async () => {
    render(<AssignMembershipSheet trigger="Asignar plan" />);
    fireEvent.click(screen.getByRole("button", { name: "Asignar plan" }));
    await dialog().findByText("Ana Pérez");
    vi.mocked(searchAssignableStudentsAction).mockClear();

    fireEvent.change(dialog().getByLabelText("Buscar alumno"), {
      target: { value: "a" },
    });
    fireEvent.change(dialog().getByLabelText("Buscar alumno"), {
      target: { value: "an" },
    });
    fireEvent.change(dialog().getByLabelText("Buscar alumno"), {
      target: { value: "ana" },
    });

    await waitFor(() =>
      expect(searchAssignableStudentsAction).toHaveBeenCalledTimes(1),
    );
    expect(searchAssignableStudentsAction).toHaveBeenCalledWith("ana");
  });

  it("skips the student step when it starts from a student", async () => {
    render(
      <AssignMembershipSheet trigger="Asignar plan" initialStudent={ana} />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Asignar plan" }));

    expect(
      dialog().getByRole("heading", { name: "Elige el plan para Ana Pérez" }),
    ).toBeTruthy();
    const steps = dialog().getByRole("list", {
      name: "Pasos de la asignación",
    });
    expect(within(steps).getAllByRole("listitem")).toHaveLength(2);
    expect(searchAssignableStudentsAction).not.toHaveBeenCalled();
    fireEvent.click(
      await dialog().findByRole("button", { name: /Mensual Adulto/ }),
    );
    expect(dialog().getByRole("heading", { name: "Revisa y confirma" })).toBeTruthy();
    expect(dialog().queryByRole("button", { name: "Cambiar" })).toBeTruthy();
  });

  it("goes straight to confirmation when student and plan are known", () => {
    render(
      <AssignMembershipSheet
        trigger="Asignar"
        initialStudent={ana}
        initialPlan={monthly}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Asignar" }));

    expect(dialog().getByRole("heading", { name: "Revisa y confirma" })).toBeTruthy();
    expect(dialog().queryByRole("list", { name: "Pasos de la asignación" })).toBeNull();
    expect(listAssignablePlansAction).not.toHaveBeenCalled();
  });

  it("starts from a plan and asks only for the student", async () => {
    render(<AssignMembershipSheet trigger="Asignar" initialPlan={monthly} />);

    fireEvent.click(screen.getByRole("button", { name: "Asignar" }));
    fireEvent.click(await dialog().findByRole("button", { name: /Ana Pérez/ }));

    expect(dialog().getByRole("heading", { name: "Revisa y confirma" })).toBeTruthy();
    expect(dialog().getByText("Mensual Adulto")).toBeTruthy();
    expect(listAssignablePlansAction).not.toHaveBeenCalled();
  });

  it("offers to create a plan without losing the selected student", async () => {
    vi.mocked(listAssignablePlansAction)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([monthly]);
    render(
      <AssignMembershipSheet trigger="Asignar plan" initialStudent={ana} />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Asignar plan" }));

    expect(
      await dialog().findByText("Aún no tienes planes activos"),
    ).toBeTruthy();
    fireEvent.change(dialog().getByLabelText("Nombre"), {
      target: { value: "Mensual Adulto" },
    });
    fireEvent.change(dialog().getByLabelText("Precio"), {
      target: { value: "30000" },
    });
    fireEvent.click(dialog().getByRole("button", { name: "Crear plan" }));

    fireEvent.click(
      await dialog().findByRole("button", { name: /Mensual Adulto/ }),
    );
    expect(dialog().getByRole("heading", { name: "Revisa y confirma" })).toBeTruthy();
    expect(dialog().getByText("Ana Pérez")).toBeTruthy();
  });

  it("keeps the membership and retries the payment with the same token", async () => {
    vi.mocked(assignMembershipAction)
      .mockResolvedValueOnce({
        status: "payment_failed",
        error:
          "La membresía quedó creada, pero el pago inicial no se registró. El saldo quedó pendiente en cobros.",
        result: {
          membershipId: "membership-1",
          studentId: ana.id,
          expiresOn: "2026-03-31",
          agreedPrice: 30000,
          currency: "CLP",
          paidAmount: 0,
          balance: 30000,
        },
      })
      .mockResolvedValueOnce({
        status: "assigned",
        error: null,
        result: {
          membershipId: "membership-1",
          studentId: ana.id,
          expiresOn: "2026-03-31",
          agreedPrice: 30000,
          currency: "CLP",
          paidAmount: 30000,
          balance: 0,
        },
      });
    render(
      <AssignMembershipSheet
        trigger="Asignar"
        initialStudent={ana}
        initialPlan={monthly}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Asignar" }));
    fireEvent.click(
      dialog().getByRole("button", { name: "Asignar y registrar pago" }),
    );

    expect(
      await dialog().findByText(/La membresía quedó creada/),
    ).toBeTruthy();
    expect(dialog().getByText(/Saldo pendiente: \$30\.000/)).toBeTruthy();
    expect(dialog().queryByRole("button", { name: "Cambiar" })).toBeNull();

    fireEvent.click(dialog().getByRole("button", { name: "Reintentar cobro" }));

    expect(await dialog().findByText("Plan asignado")).toBeTruthy();
    const [first, second] = vi
      .mocked(assignMembershipAction)
      .mock.calls.map(([, formData]) => formData as FormData);
    expect(second.get("assignmentToken")).toBe(first.get("assignmentToken"));
    expect(second.get("withPayment")).toBe("on");
    expect(second.get("startsOn")).toBe(first.get("startsOn"));
  });

  it("assigns without payment and shows the pending balance", () => {
    render(
      <AssignMembershipSheet
        trigger="Asignar"
        initialStudent={ana}
        initialPlan={monthly}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Asignar" }));

    fireEvent.click(
      dialog().getByRole("switch", { name: /Registrar pago inicial/ }),
    );

    expect(dialog().queryByLabelText("Monto pagado")).toBeNull();
    const balance = dialog().getByText("Saldo resultante").closest("div")!;
    expect(within(balance).getByText("$30.000")).toBeTruthy();
    expect(dialog().getByRole("button", { name: "Asignar plan" })).toBeTruthy();
  });

  it("blocks the payment submit when the amount is empty", () => {
    render(
      <AssignMembershipSheet
        trigger="Asignar"
        initialStudent={ana}
        initialPlan={monthly}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Asignar" }));

    fireEvent.change(dialog().getByLabelText("Monto pagado"), {
      target: { value: "" },
    });

    expect(
      (
        dialog().getByRole("button", {
          name: "Asignar y registrar pago",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
  });
});
