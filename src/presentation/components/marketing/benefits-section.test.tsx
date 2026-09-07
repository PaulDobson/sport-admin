import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BenefitsSection } from "./benefits-section";
import { benefitsContent } from "./content";

// jsdom does not implement IntersectionObserver, required by Framer Motion's whileInView.
class IntersectionObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal("IntersectionObserver", IntersectionObserverStub);

afterEach(cleanup);

describe("BenefitsSection", () => {
  it("renders the three benefit sections from the marketing content", () => {
    render(<BenefitsSection />);

    for (const benefit of benefitsContent) {
      expect(screen.getByRole("heading", { name: benefit.title })).toBeTruthy();
      expect(screen.getByText(benefit.description)).toBeTruthy();
    }
  });
});
