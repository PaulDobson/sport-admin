import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NavigationProgressBar } from "./navigation-progress-bar";

const { usePathnameMock, useSearchParamsMock } = vi.hoisted(() => ({
  usePathnameMock: vi.fn(),
  useSearchParamsMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: usePathnameMock,
  useSearchParams: useSearchParamsMock,
}));

afterEach(cleanup);

function setRoute(pathname: string, search = "") {
  usePathnameMock.mockReturnValue(pathname);
  useSearchParamsMock.mockReturnValue(new URLSearchParams(search));
}

function renderBar() {
  return render(<NavigationProgressBar />);
}

function clickAnchor(attrs: Record<string, string> = {}) {
  const anchor = document.createElement("a");
  anchor.href = attrs.href ?? "/dashboard/students";
  if (attrs.target) anchor.target = attrs.target;
  if (attrs.download !== undefined) anchor.setAttribute("download", "");
  document.body.appendChild(anchor);
  fireEvent.click(anchor, { button: 0 });
  return anchor;
}

describe("NavigationProgressBar", () => {
  it("stays hidden until an internal navigation click happens", () => {
    setRoute("/dashboard");
    renderBar();

    expect(screen.getByRole("progressbar", { hidden: true }).getAttribute("aria-hidden")).toBe(
      "true",
    );

    act(() => {
      clickAnchor({ href: "/dashboard/students" });
    });

    expect(screen.getByRole("progressbar", { hidden: true }).getAttribute("aria-hidden")).toBe(
      "false",
    );
  });

  it("ignores clicks on external links, new tabs, and downloads", () => {
    setRoute("/dashboard");
    renderBar();

    act(() => {
      clickAnchor({ href: "https://example.com" });
      clickAnchor({ href: "/dashboard/students", target: "_blank" });
      clickAnchor({ href: "/dashboard/students", download: "" });
    });

    expect(screen.getByRole("progressbar", { hidden: true }).getAttribute("aria-hidden")).toBe(
      "true",
    );
  });

  it("ignores clicks whose default was already prevented", () => {
    setRoute("/dashboard");
    renderBar();

    const anchor = document.createElement("a");
    anchor.href = "/dashboard/students";
    anchor.addEventListener("click", (event) => event.preventDefault());
    document.body.appendChild(anchor);

    act(() => {
      fireEvent.click(anchor, { button: 0 });
    });

    expect(screen.getByRole("progressbar", { hidden: true }).getAttribute("aria-hidden")).toBe(
      "true",
    );
  });
});
