import { cleanup, render } from "@testing-library/react";
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

describe("Spinner", () => {
  it("renders as a decorative, non-repeating indicator when it appears", async () => {
    useReducedMotionMock.mockReturnValue(false);
    const { Spinner } = await import("./spinner");

    const { container } = render(<Spinner />);

    expect(container.querySelector('[aria-hidden="true"]')).toBeTruthy();
  });

  it("does not repeat the rotation when reduced motion is preferred", async () => {
    useReducedMotionMock.mockReturnValue(true);
    const { Spinner } = await import("./spinner");

    const { container } = render(<Spinner />);
    const hand = container.querySelector("line");

    expect(hand?.style.transform).not.toContain("360");
  });
});
