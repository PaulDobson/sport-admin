import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ProfileForm } from "./profile-form";

vi.mock("react", async () => {
  const actual = await vi.importActual<typeof import("react")>("react");
  return {
    ...actual,
    useActionState: () => [{ error: null, saved: false }, vi.fn(), false],
  };
});

afterEach(cleanup);

describe("ProfileForm", () => {
  it("renders persisted identity fields without fake preference controls", () => {
    render(<ProfileForm fullName="Ana Silva" avatarUrl={null} />);

    expect(screen.getByDisplayValue("Ana Silva")).toBeTruthy();
    expect(
      screen.getByRole("textbox", { name: "URL del avatar" }),
    ).toBeTruthy();
    expect(screen.queryByRole("checkbox")).toBeNull();
    expect(screen.queryByText(/notificaciones/i)).toBeNull();
  });
});
