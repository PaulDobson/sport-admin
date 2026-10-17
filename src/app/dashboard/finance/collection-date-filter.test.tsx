import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { CollectionDateFilter } from "./collection-date-filter";

afterEach(cleanup);

describe("CollectionDateFilter", () => {
  it("submits the date range keeping the section and the active status chip", () => {
    render(<CollectionDateFilter status="past_due" from="2026-08-01" />);

    const [inline] = screen.getAllByRole("form", {
      name: "Filtrar por fecha de cobro",
    });
    expect(
      (within(inline).getByLabelText("Cobro desde") as HTMLInputElement).value,
    ).toBe("2026-08-01");
    const hidden = [
      ...inline.querySelectorAll<HTMLInputElement>('input[type="hidden"]'),
    ].map((input) => `${input.name}=${input.value}`);
    expect(hidden).toEqual(["section=collections", "status=past_due"]);
    expect(
      within(inline)
        .getByRole("link", { name: "Quitar fechas" })
        .getAttribute("href"),
    ).toBe("/dashboard/finance?section=collections&status=past_due");
  });

  it("does not offer clearing when no range is applied", () => {
    render(<CollectionDateFilter />);

    expect(screen.queryByRole("link", { name: "Quitar fechas" })).toBeNull();
    expect(screen.getByRole("button", { name: "Fechas" })).toBeTruthy();
  });

  it("opens the same filter in a sheet on mobile and flags an active range", () => {
    render(<CollectionDateFilter to="2026-08-31" />);

    fireEvent.click(
      screen.getByRole("button", { name: "Fechas (filtro activo)" }),
    );

    const dialog = screen.getByRole("dialog", { name: "Fechas de cobro" });
    expect(
      (within(dialog).getByLabelText("Cobro hasta") as HTMLInputElement).value,
    ).toBe("2026-08-31");
    expect(
      within(dialog).getByRole("button", { name: "Aplicar fechas" }),
    ).toBeTruthy();
  });
});
