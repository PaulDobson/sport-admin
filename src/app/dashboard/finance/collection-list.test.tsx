import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CollectionItem } from "@/domain/instructor-finance/collection";
import { CollectionList } from "./collection-list";
import { recordPaymentAction, transitionMembershipAction } from "./actions";

vi.mock("./actions", () => ({
  recordPaymentAction: vi.fn(),
  transitionMembershipAction: vi.fn(),
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
}));

function item(overrides: Partial<CollectionItem> = {}): CollectionItem {
  return {
    membershipId: "8b0d1a5e-6f2a-4f0e-8f4f-9b2b0f1f2a33",
    studentId: "1e5b6c7d-8a9f-4b0c-9d1e-2f3a4b5c6d7e",
    studentName: "Ana Pérez",
    planName: "Mensual",
    status: "past_due",
    expiresOn: "2026-08-30",
    nextBillingDate: "2026-08-31",
    expirationGraceDays: 5,
    currency: "CLP",
    contractedAmount: 45000,
    balance: 45000,
    dueOn: "2026-08-31",
    overdueDays: 5,
    isOverdue: true,
    ...overrides,
  };
}

beforeEach(() => {
  vi.mocked(recordPaymentAction).mockReset();
  vi.mocked(transitionMembershipAction).mockReset();
});

afterEach(cleanup);

describe("collection list", () => {
  it("shows an empty state when nothing is pending", () => {
    render(<CollectionList items={[]} today="2026-09-05" canManage />);

    expect(screen.getByText("Sin cobros pendientes")).toBeTruthy();
  });

  it("prefills the payment amount with the outstanding balance and keeps it editable", () => {
    render(<CollectionList items={[item()]} today="2026-09-05" canManage />);

    fireEvent.click(screen.getByRole("button", { name: "Cobrar" }));
    const amount = screen.getByLabelText("Monto") as HTMLInputElement;
    expect(amount.value).toBe("45000");

    fireEvent.change(amount, { target: { value: "20000" } });
    expect(amount.value).toBe("20000");
    expect(screen.getByText(/Saldo tras el pago/)).toBeTruthy();
  });

  it("offers the collection method on the payment sheet", () => {
    render(<CollectionList items={[item()]} today="2026-09-05" canManage />);

    fireEvent.click(screen.getByRole("button", { name: "Cobrar" }));
    const method = screen.getByLabelText("Método") as HTMLSelectElement;
    expect([...method.options].map((option) => option.value)).toEqual([
      "cash",
      "transfer",
      "card",
      "other",
    ]);
  });

  it("requires confirmation before a destructive lifecycle transition", () => {
    render(<CollectionList items={[item()]} today="2026-09-05" canManage />);

    fireEvent.click(screen.getByRole("button", { name: "Membresía" }));
    const apply = screen.getByRole("button", { name: "Aplicar" });
    expect((apply as HTMLButtonElement).disabled).toBe(false);

    fireEvent.change(screen.getByLabelText("Acción"), {
      target: { value: "cancel" },
    });
    expect(
      (screen.getByRole("button", { name: "Aplicar" }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);

    fireEvent.click(screen.getByRole("checkbox"));
    expect(
      (screen.getByRole("button", { name: "Aplicar" }) as HTMLButtonElement)
        .disabled,
    ).toBe(false);
  });

  it("does not offer transitions that are invalid for the current status", () => {
    render(
      <CollectionList
        items={[item({ status: "expired" })]}
        today="2026-09-05"
        canManage
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Membresía" }));
    const options = [
      ...(screen.getByLabelText("Acción") as HTMLSelectElement).options,
    ].map((option) => option.value);
    expect(options).not.toContain("pause");
    expect(options).not.toContain("expire");
    expect(options).toContain("renew");
  });

  it("previews the renewal expiry with the billing cycle before applying", () => {
    render(
      <CollectionList
        items={[
          item({
            status: "expired",
            expiresOn: "2026-01-30",
            nextBillingDate: "2026-01-31",
            billingCycle: "quarterly",
          }),
        ]}
        today="2026-01-15"
        canManage
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Membresía" }));

    expect(screen.getByText("Qué pasará")).toBeTruthy();
    expect(screen.getByText(/Queda activa hasta el 29 abr 2026/)).toBeTruthy();
    expect(screen.getByText(/cobro de \$45\.000/)).toBeTruthy();
    const effectiveOn = document.querySelector(
      'input[name="effectiveOn"]',
    ) as HTMLInputElement;
    expect(effectiveOn.value).toBe("2026-01-15");
  });

  it("explains the grace period and cancellation effects", () => {
    render(<CollectionList items={[item()]} today="2026-09-02" canManage />);

    fireEvent.click(screen.getByRole("button", { name: "Membresía" }));
    fireEvent.change(screen.getByLabelText("Acción"), {
      target: { value: "expire" },
    });
    expect(
      screen.getByText(/Pasa a En mora desde el 2 sept 2026|Pasa a En mora desde el 2 sep 2026/),
    ).toBeTruthy();

    fireEvent.change(screen.getByLabelText("Acción"), {
      target: { value: "cancel" },
    });
    expect(
      screen.getByText(/saldo pendiente de \$45\.000 queda en el historial/),
    ).toBeTruthy();
  });

  it("does not offer expiring a membership before its expiry date", () => {
    render(
      <CollectionList
        items={[item({ status: "active", expiresOn: "2026-09-30" })]}
        today="2026-09-05"
        canManage
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Membresía" }));
    const options = [
      ...(screen.getByLabelText("Acción") as HTMLSelectElement).options,
    ].map((option) => option.value);
    expect(options).not.toContain("expire");
    expect(options).toContain("pause");
  });

  it("hides collection actions for roles that cannot manage finance", () => {
    render(
      <CollectionList items={[item()]} today="2026-09-05" canManage={false} />,
    );

    expect(screen.queryByRole("button", { name: "Cobrar" })).toBeNull();
    expect(screen.getByText("Ana Pérez")).toBeTruthy();
  });
});
