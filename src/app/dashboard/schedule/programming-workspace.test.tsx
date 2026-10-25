import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ProgrammingWorkspace } from "./programming-workspace";
import { groupProgrammingSchedules } from "./schedules-workspace";

const actions = vi.hoisted(() => ({
  createClassTemplateAction: vi.fn(),
  createDisciplineAction: vi.fn(),
  createLocationAction: vi.fn(),
  previewProgrammingAction: vi.fn(),
  saveProgrammingAction: vi.fn(),
  saveClassTemplateAction: vi.fn(),
}));
vi.mock("./programming-actions", () => actions);

const ready = {
  disciplines: [{ id: "discipline-1", name: "Yoga" }],
  templates: [
    {
      id: "template-1",
      name: "Yoga inicial",
      capacity: 16,
      disciplineName: "Yoga",
    },
  ],
  locations: [
    { id: "location-1", name: "Parque Norte" },
    { id: "location-2", name: "Sala Sur" },
  ],
  today: "2026-10-19",
  throughDate: "2026-11-01",
};

function renderWorkspace(
  overrides: Partial<Parameters<typeof ProgrammingWorkspace>[0]> = {},
) {
  return render(<ProgrammingWorkspace {...ready} {...overrides} />);
}

function selectClass() {
  fireEvent.change(screen.getByRole("combobox", { name: "Clase" }), {
    target: { value: "template-1" },
  });
  fireEvent.submit(
    screen.getByRole("combobox", { name: "Clase" }).closest("form")!,
  );
}

function goToWhen() {
  selectClass();
  fireEvent.change(screen.getByRole("combobox", { name: "Lugar" }), {
    target: { value: "location-1" },
  });
  fireEvent.submit(
    screen.getByRole("combobox", { name: "Lugar" }).closest("form")!,
  );
}

async function review() {
  fireEvent.submit(
    screen.getByRole("button", { name: "Revisar y publicar" }).closest("form")!,
  );
  await screen.findByRole("button", { name: "Publicar clases" });
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: "Atrás" }).hasAttribute("disabled"),
    ).toBe(false),
  );
}

function lastPayload(action = actions.previewProgrammingAction) {
  const data: FormData = action.mock.calls.at(-1)![1];
  return JSON.parse(String(data.get("programming")));
}

beforeEach(() => {
  vi.clearAllMocks();
  window.history.replaceState(null, "", "/dashboard/schedule/programming");
  Element.prototype.scrollIntoView = vi.fn();
  actions.createClassTemplateAction.mockResolvedValue({
    error: null,
    message: "Clase creada.",
    created: { id: "new-class", name: "Yoga nueva" },
  });
  actions.createDisciplineAction.mockResolvedValue({
    error: null,
    message: "Disciplina creada.",
    created: { id: "new-discipline", name: "Pilates" },
  });
  actions.createLocationAction.mockResolvedValue({
    error: null,
    message: "Ubicación creada.",
    created: { id: "new-location", name: "Sala Nueva" },
  });
  actions.previewProgrammingAction.mockResolvedValue({
    error: null,
    message: null,
    preview: {
      newCount: 6,
      existingCount: 0,
      conflicts: [],
      occurrences: [
        {
          startsAt: "2026-10-19T21:00:00Z",
          endsAt: "2026-10-19T22:00:00Z",
          locationId: "location-1",
        },
      ],
    },
  });
  actions.saveProgrammingAction.mockResolvedValue({
    error: null,
    message: "6 sesiones nuevas. 0 existentes conservadas.",
  });
});
afterEach(cleanup);

describe("ProgrammingWorkspace guided scheduling", () => {
  it("renders the four-step wizard", () => {
    renderWorkspace();
    expect(
      screen.getByRole("list", { name: "Pasos para programar" }).children,
    ).toHaveLength(4);
    expect(
      screen.queryByRole("button", { name: "Publicar clases" }),
    ).toBeNull();
  });

  it("prepares three days at once and publishes only after review", async () => {
    renderWorkspace();
    goToWhen();
    expect(
      screen
        .getByRole("button", { name: "Lunes" })
        .getAttribute("aria-pressed"),
    ).toBe("true");
    await review();
    expect(lastPayload().slots).toEqual(
      [1, 3, 5].map((dayOfWeek) => ({
        dayOfWeek,
        startsAt: "18:00",
        endsAt: "19:00",
        locationId: "location-1",
      })),
    );
    expect(lastPayload().timezone).toBe("America/Santiago");
    expect(actions.saveProgrammingAction).not.toHaveBeenCalled();
    fireEvent.submit(
      screen.getByRole("button", { name: "Publicar clases" }).closest("form")!,
    );
    expect(
      await screen.findByRole("heading", { name: "Programación guardada" }),
    ).toBeTruthy();
    expect(lastPayload(actions.saveProgrammingAction).operationId).toBe(
      lastPayload().operationId,
    );
    expect(
      screen
        .getByRole("link", { name: "Ver en la agenda" })
        .getAttribute("href"),
    ).toBe("/dashboard/schedule");
  });

  it("supports different hours, additional slots and a different place per day", async () => {
    renderWorkspace();
    goToWhen();
    fireEvent.click(
      screen.getByRole("button", { name: "Personalizar horario por día" }),
    );
    // Multiple slots exist (Mon/Wed/Fri); grab the first instance of each label
    const inicioInputs = screen.getAllByLabelText(/^Inicio · 1/);
    fireEvent.change(inicioInputs[0], { target: { value: "17:00" } });
    const lugarInputs = screen.getAllByLabelText(/^Lugar · 1/);
    fireEvent.change(lugarInputs[0], { target: { value: "location-2" } });
    fireEvent.click(
      screen.getAllByRole("button", { name: /Añadir franja/ })[0],
    );
    await review();
    expect(lastPayload().slots.length).toBeGreaterThanOrEqual(3);
  });

  it("updates the end time from duration and supports one-off overnight classes", async () => {
    renderWorkspace();
    goToWhen();
    fireEvent.click(screen.getByRole("radio", { name: "Una fecha" }));
    fireEvent.change(screen.getByLabelText("Inicio"), {
      target: { value: "23:30" },
    });
    fireEvent.click(screen.getByRole("button", { name: "90 min" }));
    expect((screen.getByLabelText("Término") as HTMLInputElement).value).toBe(
      "01:00",
    );
    await review();
    expect(lastPayload().mode).toBe("once");
    expect(lastPayload().slots[0]).toMatchObject({
      startsAt: "23:30",
      endsAt: "01:00",
    });
  });

  it("offers saving the weekly routine without publishing sessions", async () => {
    renderWorkspace();
    goToWhen();
    fireEvent.click(
      screen.getByRole("button", { name: "Solo guardar horarios" }),
    );
    const save = await screen.findByRole("button", {
      name: "Guardar horarios",
    });
    await waitFor(() => expect(save.hasAttribute("disabled")).toBe(false));
    fireEvent.submit(save.closest("form")!);
    await screen.findByRole("heading", { name: "Programación guardada" });
    const data: FormData = actions.saveProgrammingAction.mock.calls[0][1];
    expect(data.get("intent")).toBe("save");
    expect(lastPayload(actions.saveProgrammingAction).slots).toHaveLength(3);
  });

  it("requires explicit conflict confirmation after showing the affected activity", async () => {
    actions.previewProgrammingAction.mockResolvedValue({
      error: null,
      message: null,
      preview: {
        newCount: 6,
        existingCount: 0,
        occurrences: [],
        conflicts: [{ message: "Pilates: lunes 18:30–19:30, Sala Sur" }],
      },
    });
    renderWorkspace();
    goToWhen();
    await review();
    const button = screen.getByRole("button", { name: "Publicar clases" });
    expect(button.hasAttribute("disabled")).toBe(true);
    expect(
      screen.getByText("Pilates: lunes 18:30–19:30, Sala Sur"),
    ).toBeTruthy();
    fireEvent.click(
      screen.getByRole("checkbox", { name: /Revisé los cruces/ }),
    );
    expect(button.hasAttribute("disabled")).toBe(false);
    fireEvent.submit(button.closest("form")!);
    await screen.findByRole("heading", { name: "Programación guardada" });
    expect(lastPayload(actions.saveProgrammingAction).allowConflict).toBe(true);
  });

  it("preserves the operation identity when retrying an uncertain failure", async () => {
    actions.saveProgrammingAction.mockResolvedValueOnce({
      error: "No se pudo confirmar la respuesta. Reintenta.",
      message: null,
    });
    renderWorkspace();
    goToWhen();
    await review();
    fireEvent.submit(
      screen.getByRole("button", { name: "Publicar clases" }).closest("form")!,
    );
    await screen.findByRole("alert");
    const first = lastPayload(actions.saveProgrammingAction).operationId;
    fireEvent.submit(
      screen.getByRole("button", { name: "Publicar clases" }).closest("form")!,
    );
    await screen.findByRole("heading", { name: "Programación guardada" });
    expect(lastPayload(actions.saveProgrammingAction).operationId).toBe(first);
  });

  it("surfaces browser network failures and allows retrying the same operation", async () => {
    actions.saveProgrammingAction.mockRejectedValueOnce(
      new TypeError("Failed to fetch"),
    );
    renderWorkspace();
    goToWhen();
    await review();
    fireEvent.submit(
      screen.getByRole("button", { name: "Publicar clases" }).closest("form")!,
    );
    expect((await screen.findByRole("alert")).textContent).toContain(
      "Comprueba tu conexión",
    );
    const first = lastPayload(actions.saveProgrammingAction).operationId;
    fireEvent.submit(
      screen.getByRole("button", { name: "Publicar clases" }).closest("form")!,
    );
    await screen.findByRole("heading", { name: "Programación guardada" });
    expect(lastPayload(actions.saveProgrammingAction).operationId).toBe(first);
  });

  it("requires another preview after editing and resets conflict approval", async () => {
    renderWorkspace();
    goToWhen();
    await review();
    const first = lastPayload().operationId;
    fireEvent.click(screen.getByRole("button", { name: "Atrás" }));
    fireEvent.change(screen.getByLabelText("Inicio"), {
      target: { value: "17:00" },
    });
    expect(
      screen.queryByRole("button", { name: "Publicar clases" }),
    ).toBeNull();
    await review();
    expect(lastPayload().operationId).not.toBe(first);
    expect(lastPayload().allowConflict).toBe(false);
  });

  it("does not enable preview without days and shows invalid per-day times", () => {
    renderWorkspace();
    goToWhen();
    for (const name of ["Lunes", "Miércoles", "Viernes"])
      fireEvent.click(screen.getByRole("button", { name }));
    expect(
      screen
        .getByRole("button", { name: "Revisar y publicar" })
        .hasAttribute("disabled"),
    ).toBe(true);
    expect(screen.getByRole("alert").textContent).toContain("al menos un día");
  });

  it("creates disciplines and classes without navigating away and auto-selects both", async () => {
    renderWorkspace({ disciplines: [], templates: [] });
    // Two copies of the form exist (desktop+mobile); interact with the first
    fireEvent.change(screen.getAllByRole("textbox", { name: /nueva/i })[0], {
      target: { value: "Pilates" },
    });
    fireEvent.submit(
      screen
        .getAllByRole("button", { name: "Crear disciplina" })[0]
        .closest("form")!,
    );
    await waitFor(() =>
      expect(
        (
          screen.getByRole("combobox", {
            name: "Disciplina",
          }) as HTMLSelectElement
        ).value,
      ).toBe("Pilates"),
    );
    fireEvent.change(
      screen.getAllByRole("textbox", { name: "Nombre de la clase" })[0],
      { target: { value: "Yoga nueva" } },
    );
    fireEvent.submit(
      screen
        .getAllByRole("button", { name: "Crear clase" })[0]
        .closest("form")!,
    );
    await waitFor(() =>
      expect(
        (screen.getByRole("combobox", { name: "Clase" }) as HTMLSelectElement)
          .value,
      ).toBe("new-class"),
    );
  });

  it("creates and selects a place using the default gym type", async () => {
    renderWorkspace({ locations: [] });
    selectClass();
    // Two copies of the form exist (desktop+mobile); interact with the first
    fireEvent.change(
      screen.getAllByRole("textbox", { name: "Nombre del lugar" })[0],
      { target: { value: "Sala Nueva" } },
    );
    fireEvent.submit(
      screen
        .getAllByRole("button", { name: "Añadir ubicación" })[0]
        .closest("form")!,
    );
    await waitFor(() =>
      expect(
        (screen.getByRole("combobox", { name: "Lugar" }) as HTMLSelectElement)
          .value,
      ).toBe("new-location"),
    );
    const data: FormData = actions.createLocationAction.mock.calls[0][1];
    expect(data.get("type")).toBe("external_gym");
  });

  it("keeps classes usable when their discipline is archived", () => {
    renderWorkspace({ disciplines: [] });
    selectClass();
    expect(screen.getByRole("combobox", { name: "Lugar" })).toBeTruthy();
  });
});

describe("groupProgrammingSchedules", () => {
  const base = {
    id: "s1",
    classTemplateId: "t1",
    classTemplateName: "Yoga",
    locationId: "l1",
    locationName: "Sala",
    instructorMembershipId: "m1",
    timezone: "America/Santiago",
    dayOfWeek: 1,
    startsAt: "18:00:00",
    endsAt: "19:00:00",
  };

  it("separates instructors, places and timezones when grouping", () => {
    expect(
      groupProgrammingSchedules([
        base,
        { ...base, id: "s2", instructorMembershipId: "other" },
        { ...base, id: "s3", locationId: "other" },
        { ...base, id: "s4", timezone: "America/Lima" },
      ]),
    ).toHaveLength(4);
  });

  it("groups matching records into a single sorted group", () => {
    const groups = groupProgrammingSchedules([
      { ...base, id: "s1", dayOfWeek: 5, startsAt: "18:00:00" },
      { ...base, id: "s2", dayOfWeek: 1, startsAt: "18:00:00" },
      { ...base, id: "s3", dayOfWeek: 3, startsAt: "18:00:00" },
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0].map((s) => s.dayOfWeek)).toEqual([1, 3, 5]);
  });
});
