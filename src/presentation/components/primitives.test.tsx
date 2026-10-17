import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import {
  Alert,
  Avatar,
  Button,
  EmptyState,
  FieldControl,
  IconButton,
  Panel,
  ResponsiveTable,
  Skeleton,
  StatCard,
  StatusBadge,
  Surface,
  SyncStatusBadge,
  ToneBadge,
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

  it("renders tone badges with text and the semantic tone class", () => {
    render(
      <>
        <ToneBadge tone="success">+14%</ToneBadge>
        <ToneBadge tone="warning">Atención</ToneBadge>
      </>,
    );

    expect(screen.getByText("+14%").className).toContain("text-success");
    expect(screen.getByText("Atención").className).toContain("text-warning");
  });

  it("renders a stat card with label, value, note and badge", () => {
    render(
      <StatCard
        label="Cobrado del mes"
        value="$125.480"
        note="de $150.000 cobrable"
        badge={{ label: "+14%", tone: "success" }}
      />,
    );

    expect(screen.getByRole("heading", { name: "Cobrado del mes" })).toBeTruthy();
    expect(screen.getByText("$125.480")).toBeTruthy();
    expect(screen.getByText("de $150.000 cobrable")).toBeTruthy();
    expect(screen.getByText("+14%").className).toContain("text-success");
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("renders an interactive stat card as an accessible link with focus styles", () => {
    render(
      <StatCard
        label="Por cobrar"
        value="$8.240"
        badge={{ label: "Atención", tone: "warning" }}
        href="/dashboard/finance?section=collections&status=past_due"
      />,
    );

    const link = screen.getByRole("link", { name: /Por cobrar.*\$8\.240/ });
    expect(link.getAttribute("href")).toBe(
      "/dashboard/finance?section=collections&status=past_due",
    );
    expect(link.className).toContain("focus-visible:outline-primary");
    expect(link.className).toContain("min-h-11");
  });

  it("labels panels by their title", () => {
    render(
      <Panel labelledBy="panel-test" title="Movimientos recientes">
        <p>contenido</p>
      </Panel>,
    );

    expect(
      screen.getByRole("region", { name: "Movimientos recientes" }).textContent,
    ).toContain("contenido");
  });

  it("exposes the same rows and actions as table and as cards", () => {
    const rows = [
      { id: "a", name: "Ana", amount: "$10" },
      { id: "b", name: "Beto", amount: "$20" },
    ];
    render(
      <ResponsiveTable
        caption="Movimientos"
        rows={rows}
        rowKey={(row) => row.id}
        columns={[
          { key: "name", header: "Alumno", cell: (row) => row.name },
          {
            key: "amount",
            header: "Monto",
            align: "end",
            cell: (row) => <button type="button">Ver {row.name}</button>,
          },
        ]}
        renderCard={(row) => (
          <div>
            {row.name} <button type="button">Ver {row.name}</button>
          </div>
        )}
      />,
    );

    const table = screen.getByRole("table", { name: "Movimientos" });
    const cards = screen.getByRole("list", { name: "Movimientos" });
    expect(within(table).getAllByRole("columnheader").map((cell) => cell.textContent)).toEqual([
      "Alumno",
      "Monto",
    ]);
    for (const row of rows) {
      expect(within(table).getByRole("button", { name: `Ver ${row.name}` })).toBeTruthy();
      expect(within(cards).getByRole("button", { name: `Ver ${row.name}` })).toBeTruthy();
    }
    expect(within(cards).getAllByRole("listitem")).toHaveLength(2);
  });
});
