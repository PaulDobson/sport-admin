import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { FinalCta } from "./final-cta";

afterEach(cleanup);

describe("FinalCta", () => {
  it("links to sign-up and gives access to log-in", () => {
    render(<FinalCta />);

    expect(
      screen
        .getByRole("link", { name: "Crear cuenta gratis" })
        .getAttribute("href"),
    ).toBe("/sign-up");
    expect(
      screen
        .getByRole("link", { name: "Ya tengo cuenta" })
        .getAttribute("href"),
    ).toBe("/log-in");
  });
});
