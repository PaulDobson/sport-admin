import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { StudentForm } from "./student-form";
import { StudentWorkspace } from "./student-workspace";
import type { StudentFormState } from "./actions";

const createStudentAction = vi.hoisted(() => vi.fn());
vi.mock("./actions", () => ({ createStudentAction, archiveStudentAction: vi.fn() }));
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
beforeEach(() => { createStudentAction.mockReset(); });

describe("StudentForm", () => {
  it("blocks duplicate submission, field edits and navigation while saving", async () => {
    let resolve: (state: StudentFormState) => void = () => { throw new Error("Uninitialized action"); };
    createStudentAction.mockImplementation(() => new Promise<StudentFormState>(done => { resolve = done; }));
    render(<StudentWorkspace><StudentForm /></StudentWorkspace>);
    fireEvent.change(screen.getByLabelText("Nombre completo"), { target: { value: "Ana" } });
    fireEvent.click(screen.getByRole("button", { name: "Crear alumno" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Guardando..." }).getAttribute("aria-busy")).toBe("true"));
    expect(screen.getByLabelText("Nombre completo").matches(":disabled")).toBe(true);
    const navigation = new MouseEvent("click", { bubbles: true, cancelable: true });
    screen.getByRole("link", { name: "Cancelar" }).dispatchEvent(navigation);
    expect(navigation.defaultPrevented).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Guardando..." }));
    expect(createStudentAction).toHaveBeenCalledTimes(1);
    await act(async () => { resolve({ error: null, saved: true, createdStudentId: "student-1" }); });
  });

  it("retains entered values after failure and exposes invalid optional fields", async () => {
    createStudentAction.mockResolvedValue({ error: "Nombre inválido", saved: false });
    render(<StudentWorkspace><StudentForm /></StudentWorkspace>);
    const name = screen.getByLabelText("Nombre completo") as HTMLInputElement;
    fireEvent.change(name, { target: { value: "Ana Bravo" } });
    const photo = screen.getByLabelText("URL de la foto");
    fireEvent.invalid(photo);
    expect(photo.closest("details")?.open).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Crear alumno" }));
    await waitFor(() => expect(screen.getByRole("alert").textContent).toBe("Nombre inválido"));
    expect(name.value).toBe("Ana Bravo");
  });

  it.each([true, false])("prevents duplicate creation after a complete/partial result (saved=%s)", async saved => {
    createStudentAction.mockResolvedValue({ error: saved ? null : "El alumno ya fue creado; falta salud", saved, createdStudentId: "student-1" });
    render(<StudentWorkspace><StudentForm /></StudentWorkspace>);
    fireEvent.change(screen.getByLabelText("Nombre completo"), { target: { value: "Ana Bravo" } });
    fireEvent.click(screen.getByRole("button", { name: "Crear alumno" }));
    await waitFor(() => expect(screen.getByRole("link", { name: "Abrir ficha del alumno creado" })).toBeTruthy());
    expect(screen.queryByRole("button", { name: "Crear alumno" })).toBeNull();
    expect(screen.getByLabelText("Nombre completo").matches(":disabled")).toBe(true);
  });

  it("protects unsaved changes when cancelling", () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<StudentWorkspace><StudentForm /></StudentWorkspace>);
    fireEvent.change(screen.getByLabelText("Nombre completo"), { target: { value: "Ana" } });
    const event = new MouseEvent("click", { bubbles: true, cancelable: true });
    screen.getByRole("link", { name: "Cancelar" }).dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining("cambios sin guardar"));
  });
});
