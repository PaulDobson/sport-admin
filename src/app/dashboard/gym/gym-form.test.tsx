import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { TenantDetails } from "@/domain/tenants/tenant-details";
import { GymForm } from "./gym-form";

const mocks = vi.hoisted(() => ({ save: vi.fn() }));
vi.mock("./actions", () => ({ updateGymAction: mocks.save }));
const details: TenantDetails = { tenantId: "tenant-a", name: "Academia", address: null, contactName: null, contactEmail: null, phone: null, city: null, region: null };
afterEach(cleanup);
beforeEach(() => vi.resetAllMocks());
const submit = () => act(async () => {
  fireEvent.submit(screen.getByRole("form", { name: "Datos del gimnasio" }));
});

describe("GymForm", () => {
  it("renders all seven persisted fields with only name required and mobile input types", () => {
    render(<GymForm details={{ ...details, address: "Central 10", city: "Santiago" }} />);
    expect(screen.getAllByRole("textbox")).toHaveLength(7);
    expect(screen.getByLabelText(/Nombre del gimnasio/).hasAttribute("required")).toBe(true);
    expect(screen.getByLabelText("Email del contacto").getAttribute("type")).toBe("email");
    expect(screen.getByLabelText("Teléfono").getAttribute("type")).toBe("tel");
    expect(screen.getByDisplayValue("Central 10")).toBeTruthy();
    expect(screen.getByLabelText("Región").hasAttribute("required")).toBe(false);
    expect((screen.getByRole("button", { name: "Guardar cambios" }) as HTMLButtonElement).disabled).toBe(true);
  });
  it("retains failed input and focuses the invalid field", async () => {
    mocks.save.mockResolvedValue({ saved: false, error: "Revisa los campos", fieldErrors: { phone: "Teléfono inválido" } });
    render(<GymForm details={details} />);
    fireEvent.change(screen.getByLabelText("Teléfono"), { target: { value: "abc" } });
    await submit();
    expect((screen.getByLabelText("Teléfono") as HTMLInputElement).value).toBe("abc");
    expect(screen.getByLabelText("Teléfono").getAttribute("aria-invalid")).toBe("true");
    expect(document.activeElement).toBe(screen.getByLabelText("Teléfono"));
    expect(screen.getByRole("alert").textContent).toContain("Revisa los campos");
  });
  it("uses normalized saved data as the clean baseline and hides stale success on edit", async () => {
    mocks.save.mockResolvedValue({ error: null, saved: true, details: { ...details, name: "Nuevo gimnasio" } });
    render(<GymForm details={details} />);
    fireEvent.change(screen.getByLabelText(/Nombre del gimnasio/), { target: { value: " Nuevo gimnasio " } });
    await submit();
    await waitFor(() => expect(screen.getByRole("status").textContent).toContain("actualizados"));
    expect((screen.getByLabelText(/Nombre del gimnasio/) as HTMLInputElement).value).toBe("Nuevo gimnasio");
    expect((screen.getByRole("button", { name: "Guardar cambios" }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(screen.getByLabelText("Ciudad"), { target: { value: "Santiago" } });
    expect(screen.queryByRole("status")).toBeNull();
    expect(screen.getByText("Tienes cambios sin guardar.")).toBeTruthy();
  });
  it("disables fields and submit while saving", async () => {
    let finish!: (value: { saved: boolean; error: string | null }) => void;
    mocks.save.mockReturnValue(new Promise(resolve => { finish = resolve; }));
    render(<GymForm details={details} />);
    fireEvent.change(screen.getByLabelText("Ciudad"), { target: { value: "Santiago" } });
    fireEvent.submit(screen.getByRole("form", { name: "Datos del gimnasio" }));
    await waitFor(() => expect(screen.getByRole("form").getAttribute("aria-busy")).toBe("true"));
    expect((screen.getByRole("button", { name: "Guardando…" }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByLabelText("Ciudad").closest("fieldset")?.disabled).toBe(true);
    await act(async () => finish({ saved: false, error: "Sin conexión" }));
  });
  it("confirms before discarding edits", () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<GymForm details={details} />);
    fireEvent.change(screen.getByLabelText("Ciudad"), { target: { value: "Santiago" } });
    fireEvent.click(screen.getByRole("button", { name: "Descartar cambios" }));
    expect((screen.getByLabelText("Ciudad") as HTMLInputElement).value).toBe("Santiago");
    confirm.mockReturnValue(true);
    fireEvent.click(screen.getByRole("button", { name: "Descartar cambios" }));
    expect((screen.getByLabelText("Ciudad") as HTMLInputElement).value).toBe("");
    confirm.mockRestore();
  });
});
