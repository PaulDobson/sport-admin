import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useMotionPreferences } from "./use-motion-preferences";

const { useReducedMotionMock } = vi.hoisted(() => ({
  useReducedMotionMock: vi.fn(),
}));

vi.mock("framer-motion", () => ({
  useReducedMotion: useReducedMotionMock,
}));

describe("useMotionPreferences", () => {
  it("returns animated entrance props when motion is not reduced", () => {
    useReducedMotionMock.mockReturnValue(false);
    const { result } = renderHook(() => useMotionPreferences());

    const props = result.current.entrance();

    expect(props.initial).toEqual({ opacity: 0, y: 24 });
    expect(props.whileInView).toEqual({ opacity: 1, y: 0 });
  });

  it("returns reduced entrance props that do not hide content when motion is reduced", () => {
    useReducedMotionMock.mockReturnValue(true);
    const { result } = renderHook(() => useMotionPreferences());

    const props = result.current.entrance();

    expect(props.initial).toBe(false);
    expect(props.whileInView).toBeUndefined();
  });
});
