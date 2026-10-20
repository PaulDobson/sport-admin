import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ClassTemplateAdministrationWorkspace } from "./class-template-administration-workspace";

const save = vi.hoisted(() => vi.fn());
vi.mock("./programming-actions", () => ({ saveClassTemplateAction: save }));
const free = { id: "free", name: "Yoga inicial", capacity: 16, disciplineName: "Yoga", scheduleCount: 0, sessionCount: 0 };
const used = { ...free, id: "used", name: "Boxeo avanzado", disciplineName: "Boxeo", scheduleCount: 2, sessionCount: 3 };
const renderCatalog = () => render(<ClassTemplateAdministrationWorkspace classes={[free, used]} />);
afterEach(cleanup);
beforeEach(() => {
  save.mockReset();
  save.mockResolvedValue({ error: null, message: "Cambios guardados." });
});

describe("class catalog administration UX", () => {
  it("shows capacity, discipline, explicit actions and deletion restrictions", () => {
    renderCatalog();
    expect(screen.getByText("Yoga · 16 cupos")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Eliminar Yoga inicial" }).hasAttribute("disabled")).toBe(false);
    const blocked = screen.getByRole("button", { name: "Eliminar Boxeo avanzado" });
    expect(blocked.hasAttribute("disabled")).toBe(true);
    const explanation = document.getElementById(blocked.getAttribute("aria-describedby")!);
    expect(explanation?.textContent).toContain("2 horarios · 3 sesiones");
    expect(explanation?.textContent).toContain("históricos");
  });
  it("also blocks classes with only sessions or only archived schedules", () => {
    render(<ClassTemplateAdministrationWorkspace classes={[
      { ...free, name: "Con sesión", sessionCount: 1 },
      { ...used, name: "Con horario", scheduleCount: 1, sessionCount: 0 },
    ]} />);
    for (const name of ["Con sesión", "Con horario"]) {
      expect(screen.getByRole("button", { name: `Eliminar ${name}` }).hasAttribute("disabled")).toBe(true);
    }
  });
  it("searches names and disciplines and offers a recovery from no matches", () => {
    renderCatalog();
    const search = screen.getByRole("searchbox", { name: "Buscar clase" });
    fireEvent.change(search, { target: { value: "boxeo" } });
    expect(screen.getByRole("heading", { name: "Boxeo avanzado" })).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Yoga inicial" })).toBeNull();
    fireEvent.change(search, { target: { value: "zzz" } });
    expect(screen.getByRole("heading", { name: "No encontramos clases" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Limpiar búsqueda" }));
    expect(screen.getByRole("heading", { name: "Yoga inicial" })).toBeTruthy();
    expect(document.activeElement).toBe(search);
  });
  it("paginates and recovers when the last page disappears after deletion", () => {
    const classes = Array.from({ length: 7 }, (_, index) => ({ ...free, id: String(index), name: `Clase ${index}` }));
    const { rerender } = render(<ClassTemplateAdministrationWorkspace classes={classes} />);
    expect(within(screen.getByRole("list", { name: "Clases creadas" })).getAllByRole("listitem")).toHaveLength(6);
    fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));
    expect(screen.getByRole("heading", { name: "Clase 6" })).toBeTruthy();
    rerender(<ClassTemplateAdministrationWorkspace classes={classes.slice(0, 6)} />);
    expect(screen.getByRole("heading", { name: "Clase 0" })).toBeTruthy();
    expect(screen.queryByRole("navigation", { name: "Paginación de clases" })).toBeNull();
  });
  it("opens prefilled editing with a fixed discipline and impact explanation", async () => {
    renderCatalog();
    fireEvent.click(screen.getByRole("button", { name: "Editar Yoga inicial" }));
    const dialog = await screen.findByRole("dialog", { name: "Editar clase" });
    const name = within(dialog).getByRole("textbox", { name: "Nombre de la clase" }) as HTMLInputElement;
    await waitFor(() => expect(document.activeElement).toBe(name));
    expect(name.value).toBe("Yoga inicial");
    expect((within(dialog).getByRole("spinbutton", { name: "Capacidad" }) as HTMLInputElement).value).toBe("16");
    expect(within(dialog).queryByRole("combobox")).toBeNull();
    expect(dialog.textContent).toContain("Las sesiones ya publicadas conservan sus cupos");
    expect(within(dialog).getByRole("button", { name: "Guardar cambios" }).hasAttribute("disabled")).toBe(true);
    fireEvent.change(name, { target: { value: "Yoga renovada" } });
    fireEvent.change(within(dialog).getByRole("spinbutton", { name: "Capacidad" }), { target: { value: "12" } });
    fireEvent.submit(within(dialog).getByRole("button", { name: "Guardar cambios" }).closest("form")!);
    await waitFor(() => expect(save).toHaveBeenCalledOnce());
    const data = save.mock.calls[0][1] as FormData;
    expect(Object.fromEntries(data)).toEqual({ operation: "update", id: "free", className: "Yoga renovada", capacity: "12" });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(screen.getByRole("status").textContent).toBe("Cambios guardados.");
  });
  it("protects unsaved changes and restores editing focus", async () => {
    renderCatalog();
    fireEvent.click(screen.getByRole("button", { name: "Editar Yoga inicial" }));
    const name = await screen.findByRole("textbox", { name: "Nombre de la clase" });
    fireEvent.change(name, { target: { value: "Mi borrador" } });
    fireEvent.keyDown(name, { key: "Escape" });
    expect(await screen.findByRole("dialog", { name: "¿Descartar los cambios?" })).toBeTruthy();
    const keepEditing = screen.getByRole("button", { name: "Seguir editando" });
    expect(document.activeElement).toBe(keepEditing);
    fireEvent.click(keepEditing);
    const restoredName = screen.getByRole("textbox", { name: "Nombre de la clase" }) as HTMLInputElement;
    expect(restoredName.value).toBe("Mi borrador");
    expect(document.activeElement).toBe(restoredName);
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    fireEvent.click(screen.getByRole("button", { name: "Descartar cambios" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(save).not.toHaveBeenCalled();
  });
  it("requires explicit deletion confirmation and initially focuses Cancel", async () => {
    renderCatalog();
    const trigger = screen.getByRole("button", { name: "Eliminar Yoga inicial" });
    trigger.focus();
    fireEvent.click(trigger);
    const dialog = await screen.findByRole("dialog", { name: "Eliminar clase" });
    expect(dialog.textContent).toContain('"Yoga inicial"');
    expect(dialog.textContent).toContain("Su disciplina se conservará");
    await waitFor(() => expect(document.activeElement).toBe(within(dialog).getByRole("button", { name: "Cancelar" })));
    fireEvent.click(within(dialog).getByRole("button", { name: "Cancelar" }));
    expect(save).not.toHaveBeenCalled();
    await waitFor(() => expect(document.activeElement).toBe(trigger));
    fireEvent.click(trigger);
    fireEvent.submit(screen.getByRole("button", { name: "Eliminar definitivamente" }).closest("form")!);
    await waitFor(() => expect(save).toHaveBeenCalledOnce());
    expect(Object.fromEntries(save.mock.calls[0][1])).toEqual({ operation: "delete", id: "free" });
  });
  it("returns focus to search if a deleted class's opener disappears", async () => {
    let resolve: (value: { error: null; message: string }) => void = () => {};
    save.mockImplementationOnce(() => new Promise((done) => { resolve = done; }));
    const { rerender } = renderCatalog();
    fireEvent.click(screen.getByRole("button", { name: "Eliminar Yoga inicial" }));
    fireEvent.submit((await screen.findByRole("button", { name: "Eliminar definitivamente" })).closest("form")!);
    await waitFor(() => expect(save).toHaveBeenCalledOnce());
    rerender(<ClassTemplateAdministrationWorkspace classes={[used]} />);
    await act(async () => resolve({ error: null, message: "Clase eliminada." }));
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("searchbox", { name: "Buscar clase" })));
  });
  it("preserves inputs and displays server errors for correction", async () => {
    save.mockResolvedValueOnce({ error: "No se pudo guardar.", message: null });
    renderCatalog();
    fireEvent.click(screen.getByRole("button", { name: "Editar Yoga inicial" }));
    const name = await screen.findByRole("textbox", { name: "Nombre de la clase" });
    fireEvent.change(name, { target: { value: "Yoga corregida" } });
    fireEvent.submit(screen.getByRole("button", { name: "Guardar cambios" }).closest("form")!);
    expect((await screen.findByRole("alert")).textContent).toBe("No se pudo guardar.");
    expect((screen.getByRole("textbox", { name: "Nombre de la clase" }) as HTMLInputElement).value).toBe("Yoga corregida");
    expect(screen.queryByRole("status")).toBeNull();
  });
  it("locks edits, repeated submission and dismissal during saving", async () => {
    let resolve: (value: { error: null; message: string }) => void = () => {};
    save.mockImplementationOnce(() => new Promise((done) => { resolve = done; }));
    renderCatalog();
    fireEvent.click(screen.getByRole("button", { name: "Editar Yoga inicial" }));
    const name = await screen.findByRole("textbox", { name: "Nombre de la clase" });
    fireEvent.change(name, { target: { value: "Yoga pendiente" } });
    fireEvent.submit(screen.getByRole("button", { name: "Guardar cambios" }).closest("form")!);
    await waitFor(() => expect(screen.getByRole("button", { name: "Guardando…" }).hasAttribute("disabled")).toBe(true));
    expect(name.hasAttribute("disabled")).toBe(true);
    expect(screen.getByRole("button", { name: "Cancelar" }).hasAttribute("disabled")).toBe(true);
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(screen.getByRole("dialog", { name: "Editar clase" })).toBeTruthy();
    await act(async () => resolve({ error: null, message: "Guardado." }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });
  it("explains a genuinely empty catalog", () => {
    render(<ClassTemplateAdministrationWorkspace classes={[]} />);
    expect(screen.getByRole("heading", { name: "Todavía no has creado clases" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Limpiar búsqueda" })).toBeNull();
  });
});
