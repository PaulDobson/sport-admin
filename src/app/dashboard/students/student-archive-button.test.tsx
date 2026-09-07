import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { StudentArchiveButton } from "./student-archive-button";

const archiveStudentAction = vi.fn();

vi.mock("./actions", () => ({
  archiveStudentAction: (...args: unknown[]) => archiveStudentAction(...args),
}));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("StudentArchiveButton", () => {
  it("cancels archive submission when confirmation is rejected", () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    render(
      <StudentArchiveButton studentId="student-1" studentName="Ana Bravo" />,
    );

    const form = screen
      .getByRole("button", { name: "Eliminar Ana Bravo" })
      .closest("form");
    const event = new Event("submit", { bubbles: true, cancelable: true });
    form?.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
    expect(window.confirm).toHaveBeenCalledWith(
      "Eliminar a Ana Bravo de alumnos activos? Se conservara su historial.",
    );
  });
});
