import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { DistributionBar, InsightRow, UsageMeter } from "./backoffice-widgets";

afterEach(cleanup);

describe("backoffice widgets", () => {
  it("describes distribution shares in text, not only colour", () => {
    render(
      <DistributionBar
        label="Cartera"
        segments={[
          { key: "a", label: "Activo", value: 3, fillClassName: "bg-success" },
          { key: "t", label: "Trial", value: 1, fillClassName: "bg-info" },
        ]}
      />,
    );
    expect(
      screen.getByRole("img", { name: "Cartera. Activo: 75%, Trial: 25%" }),
    ).toBeTruthy();
    expect(screen.getByText("Activo")).toBeTruthy();
    expect(screen.getByText("75%")).toBeTruthy();
  });

  it("exposes usage against the plan limit", () => {
    render(<UsageMeter label="Alumnos" used={45} limit={50} />);
    const meter = screen.getByRole("progressbar", { name: "Alumnos: 45 de 50" });
    expect(meter.getAttribute("aria-valuenow")).toBe("45");
    expect(meter.querySelector("span")?.className).toContain("bg-warning");
  });

  it("renders insight rows as links when navigable", () => {
    render(
      <InsightRow
        title="2 tenants en mora"
        caption="$10.000 vencido"
        status={{ label: "Cobrar", tone: "destructive" }}
        href="/backoffice/finance"
      />,
    );
    expect(
      screen.getByRole("link", { name: /2 tenants en mora/ }).getAttribute("href"),
    ).toBe("/backoffice/finance");
    expect(screen.getByText("Cobrar")).toBeTruthy();
  });
});
