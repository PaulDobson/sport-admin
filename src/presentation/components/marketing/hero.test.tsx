import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Hero } from "./hero";

// jsdom does not implement IntersectionObserver, required by Framer Motion's whileInView.
class IntersectionObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal("IntersectionObserver", IntersectionObserverStub);

afterEach(cleanup);

describe("Hero", () => {
  it("links the primary and secondary CTAs to sign-up and log-in by default", () => {
    render(<Hero />);

    expect(
      screen
        .getByRole("link", { name: "Crear cuenta gratis" })
        .getAttribute("href"),
    ).toBe("/sign-up");
    expect(
      screen.getByRole("link", { name: "Iniciar sesión" }).getAttribute("href"),
    ).toBe("/log-in");
  });

  it("points the primary CTA to a custom destination when provided", () => {
    render(<Hero primaryHref="/dashboard" primaryLabel="Ir a mi panel" />);

    expect(
      screen.getByRole("link", { name: "Ir a mi panel" }).getAttribute("href"),
    ).toBe("/dashboard");
  });
});
