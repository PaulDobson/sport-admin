import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AttendanceForm } from "./attendance-form";
import { saveAttendanceAction, searchAttendanceStudentsAction } from "./actions";

const put = vi.fn();
const close = vi.fn();

vi.mock("@/infrastructure/composition/synchronization-composition", () => ({
  createOfflineStore: () => ({
    put,
    get: vi.fn(),
    list: vi.fn(),
    remove: vi.fn(),
    clearTenant: vi.fn(),
    close,
  }),
}));

vi.mock("./actions", () => ({
  saveAttendanceAction: vi.fn(),
  searchAttendanceStudentsAction: vi.fn(),
}));

describe("AttendanceForm mobile flow", () => {
  beforeEach(() => {
    put.mockReset();
    close.mockReset();
    vi.mocked(saveAttendanceAction).mockReset();
    vi.mocked(searchAttendanceStudentsAction).mockReset();
    HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
    HTMLDialogElement.prototype.close = function () { this.removeAttribute("open"); };
    Object.defineProperty(navigator, "onLine", {
      configurable: true,
      value: false,
    });
  });

  afterEach(cleanup);

  it("queues attendance and shows its pending state without a network", async () => {
    render(
      <AttendanceForm
        sessionId="f1541ed4-ee2c-45df-8618-72d96e682ad7"
        tenantId="c84d5db9-bc46-4f45-aa31-d16e77327c01"
        recordedByMembershipId="89721ba3-65e0-467d-bffa-abf4249cf3c6"
        batchOperationId="0d23446f-7386-4eba-b217-9f94f2ae45a7"
        participants={[
          {
            studentId: "905fd6fc-9f10-4cf7-8aee-b9f187f2f3d1",
            studentName: "Ana Pérez",
          },
        ]}
        operationIds={["3b39a94c-a8f0-44b2-959a-2e8e1f03c9d1"]}
      />,
    );

    fireEvent.submit(
      screen
        .getByRole("button", { name: "Guardar asistencia" })
        .closest("form")!,
    );

    await waitFor(() => expect(put).toHaveBeenCalledOnce());
    expect((await screen.findByRole("status")).textContent).toContain(
      "pendiente de sincronización",
    );
    expect(close).toHaveBeenCalledOnce();
  });

  it("saves five students as one batch after marking an exception", async () => {
    Object.defineProperty(navigator, "onLine", {
      configurable: true,
      value: true,
    });
    vi.mocked(saveAttendanceAction).mockResolvedValue({
      error: null,
      saved: true,
    });
    const participants = Array.from({ length: 5 }, (_, index) => ({
      studentId: `905fd6fc-9f10-4cf7-8aee-b9f187f2f3d${index + 1}`,
      studentName: `Alumno ${index + 1}`,
    }));

    const { container } = render(
      <AttendanceForm
        sessionId="f1541ed4-ee2c-45df-8618-72d96e682ad7"
        tenantId="c84d5db9-bc46-4f45-aa31-d16e77327c01"
        recordedByMembershipId="89721ba3-65e0-467d-bffa-abf4249cf3c6"
        batchOperationId="0d23446f-7386-4eba-b217-9f94f2ae45a7"
        participants={participants}
        operationIds={participants.map(
          (_, index) => `3b39a94c-a8f0-44b2-959a-2e8e1f03c9d${index + 1}`,
        )}
      />,
    );
    const form = within(container);

    expect(form.getAllByRole("link")).toHaveLength(5);
    expect(
      form.getAllByRole("button", { name: "Guardar asistencia" }),
    ).toHaveLength(1);

    fireEvent.change(form.getAllByLabelText("Estado")[2], {
      target: { value: "absent" },
    });
    fireEvent.change(form.getAllByLabelText("Novedad")[2], {
      target: { value: "Avisó su ausencia" },
    });
    fireEvent.submit(
      form.getByRole("button", { name: "Guardar asistencia" }).closest("form")!,
    );

    await waitFor(() => expect(saveAttendanceAction).toHaveBeenCalledOnce());
    const submitted = vi.mocked(saveAttendanceAction).mock.calls[0][1];
    expect(submitted.getAll("studentId")).toEqual(
      participants.map((participant) => participant.studentId),
    );
    expect(submitted.getAll("status")).toEqual([
      "present",
      "present",
      "absent",
      "present",
      "present",
    ]);
    expect(submitted.getAll("note")).toEqual([
      "",
      "",
      "Avisó su ausencia",
      "",
      "",
    ]);
    expect((await form.findByRole("status")).textContent).toContain(
      "Asistencia guardada.",
    );
  });

  it("adds an unreserved student to an empty roster without duplicates and saves in the batch", async () => {
    Object.defineProperty(navigator, "onLine", { configurable: true, value: true });
    vi.mocked(searchAttendanceStudentsAction).mockResolvedValue({
      error: null, students: [{ studentId: "905fd6fc-9f10-4cf7-8aee-b9f187f2f3d1", studentName: "Ana Pérez" }],
      page: 1, total: 1, search: "Ana", searched: true,
    });
    vi.mocked(saveAttendanceAction).mockResolvedValue({ error: null, saved: true });
    render(<AttendanceForm sessionId="f1541ed4-ee2c-45df-8618-72d96e682ad7" tenantId="c84d5db9-bc46-4f45-aa31-d16e77327c01" recordedByMembershipId="89721ba3-65e0-467d-bffa-abf4249cf3c6" batchOperationId="0d23446f-7386-4eba-b217-9f94f2ae45a7" participants={[]} operationIds={[]} />);
    expect(screen.getByRole("button", { name: "Guardar asistencia" }).hasAttribute("disabled")).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Añadir alumnos sin reserva" }));
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "Ana" } });
    fireEvent.click(await screen.findByRole("checkbox", { name: "Seleccionar: Ana Pérez" }));
    fireEvent.click(screen.getByRole("button", { name: "Añadir 1 a la lista" }));
    expect(screen.getByText("Sin reserva")).toBeTruthy();
    expect(screen.getAllByRole("link", { name: "Ana Pérez" })).toHaveLength(1);
    expect((screen.getByLabelText("Estado") as HTMLSelectElement).value).toBe("present");
    fireEvent.submit(screen.getByRole("button", { name: "Guardar asistencia" }).closest("form")!);
    await waitFor(() => expect(saveAttendanceAction).toHaveBeenCalledOnce());
    const data = vi.mocked(saveAttendanceAction).mock.calls[0][1];
    expect(data.getAll("studentId")).toEqual(["905fd6fc-9f10-4cf7-8aee-b9f187f2f3d1"]);
    expect(data.getAll("status")).toEqual(["present"]);
    expect(data.getAll("operationId")[0]).toMatch(/^[0-9a-f-]{36}$/);
    await waitFor(() => expect(screen.queryByRole("button", { name: "Quitar a Ana Pérez del lote" })).toBeNull());
  });

  it("preserves failed input and lets the user remove only unsaved additions", async () => {
    Object.defineProperty(navigator, "onLine", { configurable: true, value: true });
    vi.mocked(searchAttendanceStudentsAction).mockResolvedValue({
      error: null, students: [{ studentId: "student-2", studentName: "Luis" }], page: 1, total: 1, search: "Luis", searched: true,
    });
    vi.mocked(saveAttendanceAction).mockResolvedValue({ error: "No se pudo guardar", saved: false });
    render(<AttendanceForm sessionId="session-1" tenantId="tenant-1" recordedByMembershipId="member-1" batchOperationId="operation-1" participants={[{ studentId: "student-1", studentName: "Ana" }]} operationIds={["operation-2"]} />);
    fireEvent.click(screen.getByRole("button", { name: "Añadir alumnos sin reserva" }));
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "Luis" } });
    fireEvent.click(await screen.findByRole("checkbox", { name: "Seleccionar: Luis" }));
    fireEvent.click(screen.getByRole("button", { name: "Añadir 1 a la lista" }));
    fireEvent.change(screen.getAllByLabelText("Estado")[0], { target: { value: "late" } });
    fireEvent.change(screen.getAllByLabelText("Novedad")[0], { target: { value: "Llegó tarde" } });
    expect((screen.getAllByLabelText("Estado")[0] as HTMLSelectElement).value).toBe("late");
    fireEvent.submit(screen.getByRole("button", { name: "Guardar asistencia" }).closest("form")!);
    expect(await screen.findByRole("alert")).toBeTruthy();
    expect((screen.getAllByLabelText("Estado")[0] as HTMLSelectElement).value).toBe("late");
    expect((screen.getAllByLabelText("Novedad")[0] as HTMLInputElement).value).toBe("Llegó tarde");
    fireEvent.click(screen.getByRole("button", { name: "Quitar a Luis del lote" }));
    expect(screen.queryByRole("link", { name: "Luis" })).toBeNull();
    expect(screen.getByRole("link", { name: "Ana" })).toBeTruthy();
  });

  it("queues a walk-in together with reserved students after losing connectivity", async () => {
    Object.defineProperty(navigator, "onLine", { configurable: true, value: true });
    vi.mocked(searchAttendanceStudentsAction).mockResolvedValue({
      error: null, students: [{ studentId: "905fd6fc-9f10-4cf7-8aee-b9f187f2f3d2", studentName: "Luis" }],
      page: 1, total: 1, search: "Luis", searched: true,
    });
    render(<AttendanceForm sessionId="f1541ed4-ee2c-45df-8618-72d96e682ad7" tenantId="c84d5db9-bc46-4f45-aa31-d16e77327c01" recordedByMembershipId="89721ba3-65e0-467d-bffa-abf4249cf3c6" batchOperationId="0d23446f-7386-4eba-b217-9f94f2ae45a7" participants={[{ studentId: "905fd6fc-9f10-4cf7-8aee-b9f187f2f3d1", studentName: "Ana" }]} operationIds={["3b39a94c-a8f0-44b2-959a-2e8e1f03c9d1"]} />);
    fireEvent.click(screen.getByRole("button", { name: "Añadir alumnos sin reserva" }));
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "Luis" } });
    await screen.findByRole("checkbox", { name: "Seleccionar: Luis" });
    Object.defineProperty(navigator, "onLine", { configurable: true, value: false });
    fireEvent.click(screen.getByRole("checkbox", { name: "Seleccionar: Luis" }));
    fireEvent.click(screen.getByRole("button", { name: "Añadir 1 a la lista" }));
    fireEvent.submit(screen.getByRole("button", { name: "Guardar asistencia" }).closest("form")!);
    await waitFor(() => expect(put).toHaveBeenCalledOnce());
    expect(put.mock.calls[0][1].payload.payload.items).toEqual([
      expect.objectContaining({ studentId: "905fd6fc-9f10-4cf7-8aee-b9f187f2f3d1", status: "present" }),
      expect.objectContaining({ studentId: "905fd6fc-9f10-4cf7-8aee-b9f187f2f3d2", status: "present" }),
    ]);
    expect(saveAttendanceAction).not.toHaveBeenCalled();
    expect(await screen.findByText(/Asistencia pendiente de sincronización/)).toBeTruthy();
  });
});
