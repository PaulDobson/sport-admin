import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DisciplineList } from "@/application/instructor-operations/ports/discipline-administration-port";
import { DisciplinesWorkspace } from "./disciplines-workspace";

const save = vi.hoisted(() => vi.fn());
vi.mock("./actions", () => ({ saveDisciplineAction: save }));
const catalog: DisciplineList = {
  total: 11, page: 1, pageSize: 10, activeCount: 10, archivedCount: 1,
  rows: [
    { id: "yoga", name: "Yoga", status: "active", createdAt: "2026-10-01T12:00:00Z", templateCount: 2 },
    { id: "pilates", name: "Pilates", status: "archived", createdAt: "2026-10-01T12:00:00Z", templateCount: 0 },
  ],
};
function renderWorkspace(overrides: Partial<Parameters<typeof DisciplinesWorkspace>[0]> = {}) {
  return render(<DisciplinesWorkspace disciplines={catalog} search="" status="all" canManage {...overrides} />);
}
afterEach(cleanup);
beforeEach(() => {
  save.mockReset();
  save.mockResolvedValue({ error: null, message: "Disciplina guardada." });
});

describe("discipline workspace", () => {
  it("renders statuses, usage, filters and pagination preserving search", () => {
    renderWorkspace({ search: "Yo", status: "active" });
    expect(screen.getByRole("heading", { name: "Yoga" })).toBeTruthy();
    expect(screen.getByText(/2 clases asociadas/)).toBeTruthy();
    expect(screen.getByRole("textbox", { name: "Buscar disciplina" }).getAttribute("value")).toBe("Yo");
    const link = screen.getByRole("link", { name: "Siguiente" });
    expect(link.getAttribute("href")).toBe("/dashboard/disciplines?status=active&page=2&pageSize=10&search=Yo");
    expect(screen.getByRole("button", { name: "Eliminar Yoga" }).hasAttribute("disabled")).toBe(true);
  });
  it("hides mutations for read-only users", () => {
    renderWorkspace({ canManage: false });
    expect(screen.queryByRole("button", { name: "Nueva disciplina" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Editar Yoga" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Eliminar Pilates" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Continuar: crear una clase" })).toBeNull();
  });
  it("offers a return to class creation when an active discipline exists", () => {
    renderWorkspace();
    expect(screen.getByRole("link", { name: "Continuar: crear una clase" }).getAttribute("href")).toBe("/dashboard/schedule/programming#class-template-setup");
  });
  it("explains the prerequisite without inviting class creation before an active discipline exists", () => {
    renderWorkspace({ disciplines: { ...catalog, activeCount: 0 } });
    expect(screen.getByRole("heading", { name: "Empieza por la actividad que enseñas" })).toBeTruthy();
    expect(screen.queryByRole("link", { name: "Continuar: crear una clase" })).toBeNull();
  });
  it("opens an accessible editor and allows reactivation", async () => {
    renderWorkspace();
    fireEvent.click(screen.getByRole("button", { name: "Editar Pilates" }));
    const dialog = await screen.findByRole("dialog", { name: "Editar disciplina" });
    expect(within(dialog).getByRole("textbox", { name: "Nombre de la disciplina" }).getAttribute("value")).toBe("Pilates");
    const status = within(dialog).getByRole("combobox", { name: /Estado/ });
    fireEvent.change(status, { target: { value: "active" } });
    fireEvent.submit(within(dialog).getByRole("button", { name: "Guardar cambios" }).closest("form")!);
    await waitFor(() => expect(save).toHaveBeenCalledOnce());
    expect(save.mock.calls[0][1].get("status")).toBe("active");
    expect(save.mock.calls[0][1].get("id")).toBe("pilates");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(screen.getByRole("status").textContent).toContain("Disciplina guardada.");
  });
  it("requires explicit confirmation for permanent deletion and supports cancellation", async () => {
    renderWorkspace();
    fireEvent.click(screen.getByRole("button", { name: "Eliminar Pilates" }));
    const dialog = await screen.findByRole("dialog", { name: "Eliminar disciplina" });
    expect(dialog.textContent).toContain('"Pilates"');
    expect(save).not.toHaveBeenCalled();
    fireEvent.click(within(dialog).getByRole("button", { name: "Cancelar" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(save).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Eliminar Pilates" }));
    fireEvent.submit(screen.getByRole("button", { name: "Eliminar definitivamente" }).closest("form")!);
    await waitFor(() => expect(save).toHaveBeenCalledOnce());
    expect(save.mock.calls[0][1].get("operation")).toBe("delete");
  });
  it("focuses the form and returns focus to the trigger on Escape", async () => {
    renderWorkspace();
    const trigger = screen.getByRole("button", { name: "Nueva disciplina" });
    trigger.focus();
    fireEvent.click(trigger);
    const name = await screen.findByRole("textbox", { name: "Nombre de la disciplina" });
    await waitFor(() => expect(document.activeElement).toBe(name));
    fireEvent.keyDown(name, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await waitFor(() => expect(document.activeElement).toBe(trigger));
  });
  it("keeps database failures visible and preserves input for correction", async () => {
    save.mockResolvedValueOnce({ error: "Ya existe una disciplina con ese nombre.", message: null });
    renderWorkspace();
    fireEvent.click(screen.getByRole("button", { name: "Nueva disciplina" }));
    const name = await screen.findByRole("textbox", { name: "Nombre de la disciplina" });
    fireEvent.change(name, { target: { value: "Yoga" } });
    fireEvent.submit(screen.getByRole("button", { name: "Crear disciplina" }).closest("form")!);
    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect((name as HTMLInputElement).value).toBe("Yoga");
    expect(screen.queryByRole("status")).toBeNull();
  });
  it("locks the form and dismissal while a mutation is pending", async () => {
    let resolve: (value: { error: null; message: string }) => void = () => {};
    save.mockImplementationOnce(() => new Promise((done) => { resolve = done; }));
    renderWorkspace();
    fireEvent.click(screen.getByRole("button", { name: "Nueva disciplina" }));
    const name = await screen.findByRole("textbox", { name: "Nombre de la disciplina" });
    fireEvent.change(name, { target: { value: "Boxeo" } });
    fireEvent.submit(screen.getByRole("button", { name: "Crear disciplina" }).closest("form")!);
    await waitFor(() => expect(screen.getByRole("button", { name: "Guardando…" }).hasAttribute("disabled")).toBe(true));
    expect(screen.getByRole("button", { name: "Cancelar" }).hasAttribute("disabled")).toBe(true);
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(screen.getByRole("dialog")).toBeTruthy();
    await act(async () => resolve({ error: null, message: "Disciplina creada." }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });
  it("distinguishes an empty catalog from unmatched filters", () => {
    renderWorkspace({ disciplines: { ...catalog, rows: [], total: 0 } });
    expect(screen.getByRole("heading", { name: "Tu catálogo empieza aquí" })).toBeTruthy();
    cleanup();
    renderWorkspace({ disciplines: { ...catalog, rows: [], total: 0 }, search: "zzz" });
    expect(screen.getByRole("heading", { name: "No encontramos disciplinas" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Limpiar filtros" }).getAttribute("href")).toBe("/dashboard/disciplines");
  });
});
