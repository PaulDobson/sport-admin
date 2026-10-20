import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { OperationalTopbar } from "./operational-topbar";

afterEach(cleanup);

describe("OperationalTopbar", () => {
  it("renders shared operational context and actions", () => {
    render(
      <OperationalTopbar
        section="Operación"
        title="Agenda"
        tenantName="Academia Norte"
        now={new Date("2026-09-09T15:30:00-03:00")}
        account={{
          profileName: "Ana Silva",
          currentTenantId: "tenant-1",
          roleLabel: "Dueña",
          tenants: [{ id: "tenant-1", name: "Academia Norte" }],
        }}
        actions={<button type="button">Cuenta</button>}
      />,
    );

    expect(screen.getByRole("heading", { name: "Agenda" })).toBeTruthy();
    expect(screen.getByText(/Academia Norte/)).toBeTruthy();
    expect(screen.getByText("15:30 hrs")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Cuenta" })).toBeTruthy();
    const date = screen.getByText("miércoles, 9 de septiembre");
    const profileButton = screen.getByRole("button", {
      name: "Cuenta de Ana Silva",
    });
    expect(date.compareDocumentPosition(profileButton)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
  });
});
