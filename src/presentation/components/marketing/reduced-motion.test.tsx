import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const { useReducedMotionMock } = vi.hoisted(() => ({
  useReducedMotionMock: vi.fn(),
}));

vi.mock("framer-motion", async () => {
  const actual =
    await vi.importActual<typeof import("framer-motion")>("framer-motion");
  return { ...actual, useReducedMotion: useReducedMotionMock };
});

afterEach(cleanup);

describe("reduced motion accessibility", () => {
  it("shows the Hero content immediately without a hidden initial state", async () => {
    useReducedMotionMock.mockReturnValue(true);
    const { Hero } = await import("./hero");

    render(<Hero />);

    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading.style.opacity).not.toBe("0");
  });

  it("shows the BenefitsSection content immediately without a hidden initial state", async () => {
    useReducedMotionMock.mockReturnValue(true);
    const { BenefitsSection } = await import("./benefits-section");

    render(<BenefitsSection />);

    const [firstCard] = screen.getAllByRole("heading", { level: 2 });
    expect(firstCard.style.opacity).not.toBe("0");
  });
});
