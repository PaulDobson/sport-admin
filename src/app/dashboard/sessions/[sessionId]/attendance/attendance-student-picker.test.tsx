import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AttendanceStudentPicker } from "./attendance-student-picker";
import { searchAttendanceStudentsAction } from "./actions";

vi.mock("./actions", () => ({ searchAttendanceStudentsAction: vi.fn() }));
afterEach(cleanup);
beforeEach(() => {
  vi.mocked(searchAttendanceStudentsAction).mockReset();
  Object.defineProperty(navigator, "onLine", { configurable: true, value: true });
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute("open"); };
});
const ana = { studentId: "student-1", studentName: "Ana Pérez" };
const luis = { studentId: "student-2", studentName: "Luis González" };
function result(students = [ana], search = "Ana", total = students.length, page = 1) {
  return { error: null, students, page, total, search, searched: true };
}
function open(onAdd = vi.fn(), selectedIds = new Set<string>()) {
  render(<AttendanceStudentPicker selectedIds={selectedIds} disabled={false} onAdd={onAdd} />);
  fireEvent.click(screen.getByRole("button", { name: "Añadir alumnos sin reserva" }));
  return screen.getByRole("searchbox");
}

describe("attendance student selector", () => {
  it("debounces from two characters and preserves selection across searches until confirmation", async () => {
    const onAdd = vi.fn();
    vi.mocked(searchAttendanceStudentsAction).mockResolvedValue(result());
    const input = open(onAdd);
    fireEvent.change(input, { target: { value: "A" } });
    await new Promise((resolve) => setTimeout(resolve, 300));
    expect(searchAttendanceStudentsAction).not.toHaveBeenCalled();
    fireEvent.change(input, { target: { value: "Ana" } });
    fireEvent.click(await screen.findByRole("checkbox", { name: "Seleccionar: Ana Pérez" }));
    expect(onAdd).not.toHaveBeenCalled();
    vi.mocked(searchAttendanceStudentsAction).mockResolvedValue(result([luis], "Luis"));
    fireEvent.change(input, { target: { value: "Luis" } });
    fireEvent.click(await screen.findByRole("checkbox", { name: "Seleccionar: Luis González" }));
    fireEvent.click(screen.getByRole("button", { name: "Revisar selección (2)" }));
    expect(screen.getAllByRole("checkbox")).toHaveLength(2);
    fireEvent.click(screen.getByRole("button", { name: "Añadir 2 a la lista" }));
    expect(onAdd).toHaveBeenCalledWith([ana, luis]);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("appends pages and blocks existing participants", async () => {
    vi.mocked(searchAttendanceStudentsAction).mockResolvedValue(result([ana], "Ana", 21));
    fireEvent.change(open(vi.fn(), new Set(["student-1"])), { target: { value: "Ana" } });
    expect((await screen.findByRole("checkbox", { name: "Seleccionar: Ana Pérez" })).hasAttribute("disabled")).toBe(true);
    vi.mocked(searchAttendanceStudentsAction).mockResolvedValue(result([luis], "Ana", 21, 2));
    fireEvent.click(screen.getByRole("button", { name: "Cargar más" }));
    await screen.findByRole("checkbox", { name: "Seleccionar: Luis González" });
    expect(screen.getAllByRole("checkbox")).toHaveLength(2);
    expect(vi.mocked(searchAttendanceStudentsAction).mock.calls[1][1].get("page")).toBe("2");
  });

  it("ignores a stale response after the query changes", async () => {
    let finish!: (value: ReturnType<typeof result>) => void;
    vi.mocked(searchAttendanceStudentsAction).mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
    const input = open();
    fireEvent.change(input, { target: { value: "Ana" } });
    await waitFor(() => expect(searchAttendanceStudentsAction).toHaveBeenCalledOnce());
    vi.mocked(searchAttendanceStudentsAction).mockResolvedValue(result([luis], "Luis"));
    fireEvent.change(input, { target: { value: "Luis" } });
    await screen.findByRole("checkbox", { name: "Seleccionar: Luis González" });
    finish(result());
    await waitFor(() => expect(screen.queryByRole("checkbox", { name: "Seleccionar: Ana Pérez" })).toBeNull());
  });

  it("discards selection on cancellation and restores trigger focus and scrolling", async () => {
    vi.mocked(searchAttendanceStudentsAction).mockResolvedValue(result());
    fireEvent.change(open(), { target: { value: "Ana" } });
    fireEvent.click(await screen.findByRole("checkbox", { name: "Seleccionar: Ana Pérez" }));
    fireEvent(screen.getByRole("dialog"), new Event("cancel", { cancelable: true }));
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Añadir alumnos sin reserva" }));
    expect(document.body.style.overflow).toBe("");
    fireEvent.click(screen.getByRole("button", { name: "Añadir alumnos sin reserva" }));
    expect(screen.getByRole("button", { name: "Añadir 0 a la lista" }).hasAttribute("disabled")).toBe(true);
  });

  it("shows empty results and explicit offline errors", async () => {
    vi.mocked(searchAttendanceStudentsAction).mockResolvedValue(result([], "Ana"));
    const input = open();
    fireEvent.change(input, { target: { value: "Ana" } });
    await screen.findByText(/No se encontraron alumnos/);
    Object.defineProperty(navigator, "onLine", { configurable: true, value: false });
    fireEvent.change(input, { target: { value: "Luis" } });
    expect((await screen.findByRole("alert")).textContent).toContain("necesita conexión");
  });

  it("does not relabel stale results on failure and retries the current query", async () => {
    vi.mocked(searchAttendanceStudentsAction).mockResolvedValue(result());
    const input = open();
    fireEvent.change(input, { target: { value: "Ana" } });
    await screen.findByRole("checkbox", { name: "Seleccionar: Ana Pérez" });
    vi.mocked(searchAttendanceStudentsAction).mockResolvedValue({ ...result([], "Luis"), error: "No se pudo buscar" });
    fireEvent.change(input, { target: { value: "Luis" } });
    await screen.findByRole("alert");
    expect(screen.queryByRole("checkbox", { name: "Seleccionar: Ana Pérez" })).toBeNull();
    vi.mocked(searchAttendanceStudentsAction).mockResolvedValue(result([luis], "Luis"));
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    await screen.findByRole("checkbox", { name: "Seleccionar: Luis González" });
  });

  it("allows returning to results after deselecting the last reviewed student", async () => {
    vi.mocked(searchAttendanceStudentsAction).mockResolvedValue(result());
    fireEvent.change(open(), { target: { value: "Ana" } });
    fireEvent.click(await screen.findByRole("checkbox", { name: "Seleccionar: Ana Pérez" }));
    fireEvent.click(screen.getByRole("button", { name: "Revisar selección (1)" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Seleccionado: Ana Pérez" }));
    fireEvent.click(screen.getByRole("button", { name: "Ver resultados" }));
    expect(screen.getByRole("checkbox", { name: "Seleccionar: Ana Pérez" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Añadir 0 a la lista" }).hasAttribute("disabled")).toBe(true);
  });
});
