import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { StudentArchiveButton } from "./student-archive-button";
import { StudentWorkspace } from "./student-workspace";

const archiveStudentAction = vi.hoisted(() => vi.fn());
vi.mock("./actions", () => ({ archiveStudentAction }));
beforeEach(() => {
  archiveStudentAction.mockReset();
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", { configurable: true, value: function (this: HTMLDialogElement) { this.open = true; } });
  Object.defineProperty(HTMLDialogElement.prototype, "close", { configurable: true, value: function (this: HTMLDialogElement) { this.open = false; this.dispatchEvent(new Event("close")); } });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe("StudentArchiveButton", () => {
  it("keeps success feedback visible when the archived row disappears", async () => {
    archiveStudentAction.mockResolvedValue({ error: null, saved: true });
    const view = render(<StudentWorkspace><StudentArchiveButton studentId="student-1" studentName="Ana Bravo" /></StudentWorkspace>);
    fireEvent.click(screen.getByRole("button", { name: "Archivar Ana Bravo" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirmar archivado" }));
    await waitFor(() => expect(screen.getByText("Ana Bravo se archivó. Su historial se conserva.")).toBeTruthy());
    view.rerender(<StudentWorkspace><p>Sin alumnos activos</p></StudentWorkspace>);
    expect(screen.getByRole("status").textContent).toContain("Ana Bravo se archivó");
  });

  it("explains archive, cancels without mutation and restores focus", () => {
    render(<StudentArchiveButton studentId="student-1" studentName="Ana Bravo" />);
    const trigger = screen.getByRole("button", { name: "Archivar Ana Bravo" });
    fireEvent.click(trigger);
    expect(screen.getByRole("dialog", { name: "Archivar a Ana Bravo" })).toBeTruthy();
    expect(screen.getByText(/Esto no elimina sus datos personales/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(archiveStudentAction).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it("shows a failed action and allows a successful retry", async () => {
    archiveStudentAction.mockResolvedValueOnce({ error: "No se pudo archivar", saved: false }).mockResolvedValueOnce({ error: null, saved: true });
    render(<StudentArchiveButton studentId="student-1" studentName="Ana Bravo" />);
    fireEvent.click(screen.getByRole("button", { name: "Archivar Ana Bravo" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirmar archivado" }));
    await waitFor(() => expect(screen.getByRole("alert").textContent).toBe("No se pudo archivar"));
    expect(archiveStudentAction.mock.calls[0][1].get("studentId")).toBe("student-1");
    fireEvent.click(screen.getByRole("button", { name: "Confirmar archivado" }));
    await waitFor(() => expect(screen.getByRole("status").textContent).toBe("Alumno archivado."));
  });
});
