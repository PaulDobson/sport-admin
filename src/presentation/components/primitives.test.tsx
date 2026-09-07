import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import {
  Alert,
  Avatar,
  Button,
  EmptyState,
  FieldControl,
  IconButton,
  Skeleton,
  StatusBadge,
  Surface,
  SyncStatusBadge,
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

  it("shows the spinner and keeps the label when a button is loading", () => {
    render(<Button isLoading>Guardando…</Button>);

    const button = screen.getByRole("button", {
      name: "Guardando…",
    }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    expect(button.getAttribute("aria-busy")).toBe("true");
  });

  it("renders stable action, surface, and form primitives", () => {
    render(
      <Surface aria-label="Panel de perfil">
        <label htmlFor="name">Nombre</label>
        <FieldControl id="name" placeholder="Nombre completo" />
        <Button variant="primary">Guardar</Button>
      </Surface>,
    );

    expect(
      screen.getByRole("region", { name: "Panel de perfil" }),
    ).toBeTruthy();
    expect(screen.getByLabelText("Nombre")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Guardar" })).toBeTruthy();
  });

  it("renders textual status and avatar fallback", () => {
    render(
      <>
        <Avatar name="Maya Torres" />
        <StatusBadge tone="warning">Pendiente</StatusBadge>
        <SyncStatusBadge status="conflict">
          Conflicto por resolver
        </SyncStatusBadge>
      </>,
    );

    expect(screen.getByLabelText("Maya Torres").textContent).toBe("MT");
    expect(screen.getByText("Pendiente")).toBeTruthy();
    expect(screen.getByText("Conflicto por resolver")).toBeTruthy();
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
