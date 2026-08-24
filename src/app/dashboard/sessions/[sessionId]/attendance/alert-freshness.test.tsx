import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AlertFreshness } from "./alert-freshness";

afterEach(() => vi.useRealTimers());

describe("AlertFreshness", () => {
  it("requires manual verification when the medical copy is stale", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-23T12:00:00Z"));
    render(<AlertFreshness checkedAt="2026-08-23T10:00:00Z" />);

    expect(screen.getByRole("alert").textContent).toContain(
      "Verifica manualmente",
    );
  });
});
