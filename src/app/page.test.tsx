import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import HomePage from "./page";

const { loadOperationalContextMock } = vi.hoisted(() => ({
  loadOperationalContextMock: vi.fn(),
}));

vi.mock("@/app/_lib/operational-context", () => ({
  loadOperationalContext: loadOperationalContextMock,
}));

// jsdom does not implement IntersectionObserver, required by Framer Motion's whileInView.
class IntersectionObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal("IntersectionObserver", IntersectionObserverStub);

afterEach(cleanup);

describe("HomePage", () => {
  it("points the primary CTA to sign-up when there is no active session", async () => {
    loadOperationalContextMock.mockResolvedValue({ status: "unauthenticated" });

    render(await HomePage());
    const hero = within(
      screen.getByRole("region", { name: "Presentación de Sport Admin" }),
    );

    expect(
      hero
        .getByRole("link", { name: "Crear cuenta gratis" })
        .getAttribute("href"),
    ).toBe("/sign-up");
  });

  it("points the primary CTA to the dashboard when there is an active session", async () => {
    loadOperationalContextMock.mockResolvedValue({
      status: "ready",
      membership: { tenantId: "tenant-1", role: "owner" },
      memberships: [],
    });

    render(await HomePage());
    const hero = within(
      screen.getByRole("region", { name: "Presentación de Sport Admin" }),
    );

    expect(
      hero.getByRole("link", { name: "Ir a mi panel" }).getAttribute("href"),
    ).toBe("/dashboard");
  });
});
