import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import {
  Alert,
  Avatar,
  EmptyState,
  IconButton,
  Skeleton,
  StatusBadge,
} from "./primitives";

afterEach(cleanup);

describe("presentation primitives", () => {
  it("gives icon actions an accessible name and tooltip", () => {
    render(
      <IconButton label="Cerrar panel" icon={<span aria-hidden>×</span>} />,
    );

    expect(screen.getByRole("button", { name: "Cerrar panel" })).toBeTruthy();
    expect(screen.getByRole("tooltip").textContent).toBe("Cerrar panel");
  });

  it("preserves the disabled state of icon actions", () => {
    render(<IconButton label="Guardar" icon="+" disabled />);

    expect(
      (screen.getByRole("button", { name: "Guardar" }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
  });

  it("renders textual status and avatar fallback", () => {
    render(
      <>
        <Avatar name="Maya Torres" />
        <StatusBadge tone="warning">Pendiente</StatusBadge>
      </>,
    );

    expect(screen.getByLabelText("Maya Torres").textContent).toBe("MT");
    expect(screen.getByText("Pendiente")).toBeTruthy();
  });

  it("renders empty, loading, and error states without changing semantics", () => {
    const { container } = render(
      <>
        <EmptyState title="Sin sesiones" description="No hay resultados." />
        <Skeleton className="h-8" />
        <Alert title="No fue posible cargar" tone="destructive">
          Intenta nuevamente.
        </Alert>
      </>,
    );

    expect(screen.getByRole("heading", { name: "Sin sesiones" })).toBeTruthy();
    expect(container.querySelector('[aria-hidden="true"]')).toBeTruthy();
    expect(screen.getByRole("alert").textContent).toContain(
      "Intenta nuevamente",
    );
  });
});
