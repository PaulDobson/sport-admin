import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { MembershipPlan } from "@/domain/instructor-finance/membership";
import { PlanCatalog } from "./plan-catalog";
import {
  createPlanAction,
  setPlanStatusAction,
  updatePlanAction,
} from "./actions";

vi.mock("./actions", () => ({
  createPlanAction: vi.fn(),
  updatePlanAction: vi.fn(),
  setPlanStatusAction: vi.fn(),
}));

function plan(overrides: Partial<MembershipPlan> = {}): MembershipPlan {
  return {
    id: "6c4a4b2c-2f0e-4a7c-9a24-0f3f0f6e1d21",
    tenantId: "0e2f8e5d-1a54-4f42-9e51-6f36f3f2a111",
    name: "Mensual Adulto",
    price: 45000,
    currency: "CLP",
    billingCycle: "monthly",
    expirationGraceDays: 5,
    benefits: ["2 clases semanales"],
    status: "active",
    membershipCount: 12,
    ...overrides,
  };
}

beforeEach(() => {
  vi.mocked(createPlanAction).mockReset();
  vi.mocked(updatePlanAction).mockReset();
  vi.mocked(setPlanStatusAction).mockReset();
});

afterEach(cleanup);

describe("plan catalog", () => {
  it("lists the plans with price, grace days, memberships and benefits", () => {
    render(<PlanCatalog plans={[plan()]} showArchived={false} canManage />);

    expect(screen.getByText("Mensual Adulto")).toBeTruthy();
    expect(screen.getByText(/12 alumnos/)).toBeTruthy();
    expect(screen.getByText(/gracia 5 días/)).toBeTruthy();
    expect(screen.getByText("2 clases semanales")).toBeTruthy();
  });

  it("keeps plan creation behind an explicit action instead of the feed", () => {
    render(<PlanCatalog plans={[plan()]} showArchived={false} canManage />);

    expect(screen.queryByLabelText("Nombre")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Nuevo plan" }));
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.getByLabelText("Nombre")).toBeTruthy();
  });

  it("warns that live memberships keep their agreed price before editing", () => {
    render(<PlanCatalog plans={[plan()]} showArchived={false} canManage />);

    fireEvent.click(screen.getByRole("button", { name: "Editar" }));
    expect(
      screen.getByText(/12 membresías vigentes conservan su precio/),
    ).toBeTruthy();
  });

  it("omits the warning when the plan has no memberships", () => {
    render(
      <PlanCatalog
        plans={[plan({ membershipCount: 0 })]}
        showArchived={false}
        canManage
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Editar" }));
    expect(screen.queryByText(/conservan su precio/)).toBeNull();
  });

  it("offers archiving for active plans and reactivation for archived ones", () => {
    const { unmount } = render(
      <PlanCatalog plans={[plan()]} showArchived={false} canManage />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Editar" }));
    expect(screen.getByRole("button", { name: "Archivar plan" })).toBeTruthy();
    unmount();

    render(
      <PlanCatalog
        plans={[plan({ status: "archived" })]}
        showArchived
        canManage
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Editar" }));
    expect(screen.getByRole("button", { name: "Reactivar plan" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Nuevo plan" })).toBeNull();
  });

  it("hides management actions for roles that cannot manage plans", () => {
    render(
      <PlanCatalog plans={[plan()]} showArchived={false} canManage={false} />,
    );

    expect(screen.queryByRole("button", { name: "Editar" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Nuevo plan" })).toBeNull();
  });

  it("shows an empty state when there are no plans", () => {
    render(<PlanCatalog plans={[]} showArchived={false} canManage />);

    expect(screen.getByText("Sin planes")).toBeTruthy();
  });
});
