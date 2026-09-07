import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import {
  FinancialControlIllustration,
  GrowthOpportunityIllustration,
  HeroIllustration,
  StudentVisibilityIllustration,
} from "./index";

afterEach(cleanup);

describe("marketing illustrations", () => {
  it("renders the hero illustration as an accessible image", () => {
    render(<HeroIllustration />);
    expect(
      screen.getByRole("img", {
        name: "Panel operativo con métricas de alumnos y sesiones",
      }),
    ).toBeTruthy();
  });

  it("renders the financial control illustration as an accessible image", () => {
    render(<FinancialControlIllustration />);
    expect(
      screen.getByRole("img", { name: "Barras de ingresos y estado de pagos" }),
    ).toBeTruthy();
  });

  it("renders the student visibility illustration as an accessible image", () => {
    render(<StudentVisibilityIllustration />);
    expect(
      screen.getByRole("img", {
        name: "Lista de alumnos con estado de asistencia",
      }),
    ).toBeTruthy();
  });

  it("renders the growth opportunity illustration as an accessible image", () => {
    render(<GrowthOpportunityIllustration />);
    expect(
      screen.getByRole("img", {
        name: "Locaciones creciendo alrededor de un punto central",
      }),
    ).toBeTruthy();
  });
});
