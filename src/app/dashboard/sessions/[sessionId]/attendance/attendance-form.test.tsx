import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AttendanceForm } from "./attendance-form";

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
}));

describe("AttendanceForm offline", () => {
  beforeEach(() => {
    put.mockReset();
    close.mockReset();
    Object.defineProperty(navigator, "onLine", {
      configurable: true,
      value: false,
    });
  });

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
});
