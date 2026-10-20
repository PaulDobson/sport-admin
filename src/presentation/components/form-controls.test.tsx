import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ChipInput,
  MoneyInput,
  SegmentedControl,
  formatMoneyInput,
  parseMoneyInput,
} from "./form-controls";

afterEach(cleanup);

function formValues(container: HTMLElement) {
  const form = container.querySelector("form");
  if (!form) throw new Error("missing form");
  return new FormData(form);
}

describe("SegmentedControl", () => {
  it("submits the selected option and reports changes", () => {
    const onChange = vi.fn();
    const { container } = render(
      <form>
        <SegmentedControl
          name="billingCycle"
          legend="Ciclo"
          defaultValue="monthly"
          onChange={onChange}
          options={[
            { value: "monthly", label: "Mensual" },
            { value: "annual", label: "Anual" },
          ]}
        />
      </form>,
    );

    expect(screen.getByRole("group", { name: "Ciclo" })).toBeTruthy();
    expect(formValues(container).get("billingCycle")).toBe("monthly");
    fireEvent.click(screen.getByRole("radio", { name: "Anual" }));
    expect(onChange).toHaveBeenCalledWith("annual");
    expect(formValues(container).get("billingCycle")).toBe("annual");
  });

  it("keeps radios focusable for keyboard navigation", () => {
    render(
      <SegmentedControl
        name="cycle"
        legend="Ciclo"
        defaultValue="monthly"
        options={[
          { value: "monthly", label: "Mensual" },
          { value: "annual", label: "Anual" },
        ]}
      />,
    );
    const radio = screen.getByRole("radio", { name: "Mensual" });
    radio.focus();
    expect(document.activeElement).toBe(radio);
  });
});

describe("ChipInput", () => {
  it("adds with Enter, removes chips and serialises newline-separated values", () => {
    const { container } = render(
      <form>
        <ChipInput name="benefits" label="Beneficios" defaultValues={["Sala"]} />
      </form>,
    );

    const input = screen.getByLabelText("Beneficios", { selector: "input" });
    fireEvent.change(input, { target: { value: "Duchas" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(formValues(container).get("benefits")).toBe("Sala\nDuchas");

    fireEvent.change(input, { target: { value: "sala" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(formValues(container).get("benefits")).toBe("Sala\nDuchas");

    fireEvent.click(screen.getByRole("button", { name: "Quitar Sala" }));
    expect(formValues(container).get("benefits")).toBe("Duchas");
  });

  it("adds with the button and ignores blank values", () => {
    const onChange = vi.fn();
    render(<ChipInput name="benefits" label="Beneficios" onChange={onChange} />);

    const add = screen.getByRole("button", { name: "Agregar" }) as HTMLButtonElement;
    expect(add.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText("Beneficios", { selector: "input" }), {
      target: { value: "  Clases libres  " },
    });
    fireEvent.click(add);
    expect(onChange).toHaveBeenCalledWith(["Clases libres"]);
  });
});

describe("MoneyInput", () => {
  it("formats CLP while submitting the raw number", () => {
    const { container } = render(
      <form>
        <MoneyInput name="price" label="Precio" currency="CLP" />
      </form>,
    );

    const input = screen.getByLabelText("Precio") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "45000" } });
    expect(input.value).toBe("45.000");
    expect(formValues(container).get("price")).toBe("45000");
  });

  it("accepts decimal amounts for currencies with cents", () => {
    expect(parseMoneyInput("1.234,5", "USD")).toBe(1234.5);
    expect(parseMoneyInput("$45.000", "CLP")).toBe(45000);
    expect(parseMoneyInput("", "CLP")).toBeNull();
    expect(formatMoneyInput(1234.5, "USD")).toBe("1.234,5");
  });

  it("reflects external value changes and shows errors accessibly", () => {
    const { rerender } = render(
      <MoneyInput name="price" label="Precio" currency="CLP" value={1000} />,
    );
    rerender(
      <MoneyInput
        name="price"
        label="Precio"
        currency="CLP"
        value={30000}
        error="Ingresa un precio"
      />,
    );
    const input = screen.getByLabelText("Precio") as HTMLInputElement;
    expect(input.value).toBe("30.000");
    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(screen.getByText("Ingresa un precio")).toBeTruthy();
  });
});
