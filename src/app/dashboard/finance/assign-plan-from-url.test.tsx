import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AssignPlanFromUrl } from "./assign-plan-from-url";

const navigation = vi.hoisted(() => ({
  search: "",
  replace: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard/finance",
  useRouter: () => ({ replace: navigation.replace, push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(navigation.search),
}));
vi.mock("./actions", () => ({
  assignMembershipAction: vi.fn(),
  listAssignablePlansAction: vi.fn(async () => []),
  searchAssignableStudentsAction: vi.fn(async () => []),
  createPlanAction: vi.fn(),
  updatePlanAction: vi.fn(),
}));

beforeEach(() => {
  navigation.replace.mockReset();
});
afterEach(cleanup);

describe("AssignPlanFromUrl", () => {
  it("stays closed without the assign parameter", () => {
    navigation.search = "section=plans";
    render(<AssignPlanFromUrl />);

    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("opens from the URL and clears only its parameter on close", () => {
    navigation.search = "section=plans&assign=1";
    render(<AssignPlanFromUrl />);

    expect(screen.getByRole("dialog", { name: "Asignar plan" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Cerrar" }));

    expect(navigation.replace).toHaveBeenCalledWith(
      "/dashboard/finance?section=plans",
      { scroll: false },
    );
  });

  it("returns to the bare path when assign was the only parameter", () => {
    navigation.search = "assign=1";
    render(<AssignPlanFromUrl />);

    fireEvent.keyDown(document, { key: "Escape" });

    expect(navigation.replace).toHaveBeenCalledWith("/dashboard/finance", {
      scroll: false,
    });
  });
});
