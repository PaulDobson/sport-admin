import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ProgrammingWorkspace, groupProgrammingSchedules } from "./programming-workspace";

const actions = vi.hoisted(() => ({
  createClassTemplateAction: vi.fn(), createDisciplineAction: vi.fn(), createLocationAction: vi.fn(),
  previewProgrammingAction: vi.fn(), saveProgrammingAction: vi.fn(), saveClassTemplateAction: vi.fn(),
}));
vi.mock("./programming-actions", () => actions);

const ready = {
  classes: [{ id: "template-1", name: "Yoga inicial", capacity: 16, disciplineName: "Yoga", scheduleCount: 3, sessionCount: 0 }],
  disciplines: [{ id: "discipline-1", name: "Yoga" }],
  templates: [{ id: "template-1", name: "Yoga inicial", capacity: 16, disciplineName: "Yoga" }],
  schedules: [1, 3, 5].map((day) => ({
    id: `schedule-${day}`, classTemplateId: "template-1", classTemplateName: "Yoga inicial",
    locationId: "location-1", locationName: "Parque Norte", instructorMembershipId: "membership-1",
    dayOfWeek: day, startsAt: "18:00:00", endsAt: "19:00:00", timezone: "America/Santiago",
  })),
  locations: [{ id: "location-1", name: "Parque Norte" }, { id: "location-2", name: "Sala Sur" }],
  today: "2026-10-19",
  throughDate: "2026-11-01",
};

function renderWorkspace(overrides: Partial<Parameters<typeof ProgrammingWorkspace>[0]> = {}) {
  return render(<ProgrammingWorkspace {...ready} {...overrides} />);
}
async function selectTab(name: string) {
  fireEvent.click(screen.getByRole("tab", { name }));
  await waitFor(() => expect(screen.getByRole("tab", { name }).getAttribute("aria-selected")).toBe("true"));
}
function selectClass() {
  fireEvent.change(screen.getByRole("combobox", { name: "Clase" }), { target: { value: "template-1" } });
  fireEvent.submit(screen.getByRole("combobox", { name: "Clase" }).closest("form")!);
}
function goToWhen() {
  selectClass();
  fireEvent.change(screen.getByRole("combobox", { name: "Lugar" }), { target: { value: "location-1" } });
  fireEvent.submit(screen.getByRole("combobox", { name: "Lugar" }).closest("form")!);
}
async function review() {
  fireEvent.submit(screen.getByRole("button", { name: "Revisar para publicar" }).closest("form")!);
  await screen.findByRole("button", { name: "Publicar clases" });
  await waitFor(() => expect(screen.getByRole("button", { name: "Atrás" }).hasAttribute("disabled")).toBe(false));
}
function lastPayload(action = actions.previewProgrammingAction) {
  const data: FormData = action.mock.calls.at(-1)![1];
  return JSON.parse(String(data.get("programming")));
}

beforeEach(() => {
  vi.clearAllMocks();
  actions.createClassTemplateAction.mockResolvedValue({ error: null, message: "Clase creada.", created: { id: "new-class", name: "Yoga nueva" } });
  actions.createDisciplineAction.mockResolvedValue({ error: null, message: "Disciplina creada.", created: { id: "new-discipline", name: "Pilates" } });
  actions.createLocationAction.mockResolvedValue({ error: null, message: "Ubicación creada.", created: { id: "new-location", name: "Sala Nueva" } });
  actions.previewProgrammingAction.mockResolvedValue({
    error: null, message: null,
    preview: { newCount: 6, existingCount: 0, conflicts: [], occurrences: [{ startsAt: "2026-10-19T21:00:00Z", endsAt: "2026-10-19T22:00:00Z", locationId: "location-1" }] },
  });
  actions.saveProgrammingAction.mockResolvedValue({ error: null, message: "6 sesiones nuevas. 0 existentes conservadas." });
  window.history.replaceState(null, "", "/dashboard/schedule/programming");
  Element.prototype.scrollIntoView = vi.fn();
});
afterEach(cleanup);

describe("ProgrammingWorkspace guided scheduling", () => {
  it("starts with one task and a four-step creation process", () => {
    renderWorkspace();
    expect(screen.getByRole("tab", { name: "Programar" }).getAttribute("aria-selected")).toBe("true");
    expect(screen.getAllByRole("tab")).toHaveLength(4);
    expect(screen.getAllByRole("tabpanel")).toHaveLength(1);
    expect(screen.getByRole("list", { name: "Pasos para programar" }).children).toHaveLength(4);
    expect(screen.queryByRole("button", { name: "Publicar clases" })).toBeNull();
  });

  it("prepares three days at once and publishes only after review", async () => {
    renderWorkspace();
    goToWhen();
    expect(screen.getByRole("button", { name: "Lunes" }).getAttribute("aria-pressed")).toBe("true");
    await review();
    expect(lastPayload().slots).toEqual([1, 3, 5].map((dayOfWeek) => ({ dayOfWeek, startsAt: "18:00", endsAt: "19:00", locationId: "location-1" })));
    expect(lastPayload().timezone).toBe("America/Santiago");
    expect(actions.saveProgrammingAction).not.toHaveBeenCalled();
    fireEvent.submit(screen.getByRole("button", { name: "Publicar clases" }).closest("form")!);
    expect(await screen.findByRole("heading", { name: "Programación guardada" })).toBeTruthy();
    expect(lastPayload(actions.saveProgrammingAction).operationId).toBe(lastPayload().operationId);
    expect(screen.getByRole("link", { name: "Ver sesiones en la agenda" }).getAttribute("href")).toBe("/dashboard/schedule");
  });

  it("supports different hours, additional slots and a different place per day", async () => {
    renderWorkspace();
    goToWhen();
    fireEvent.click(screen.getByRole("button", { name: "Personalizar horario por día" }));
    fireEvent.change(screen.getByLabelText("Inicio · Viernes 1"), { target: { value: "17:00" } });
    fireEvent.change(screen.getByLabelText("Lugar · Viernes 1"), { target: { value: "location-2" } });
    fireEvent.click(screen.getByRole("button", { name: "Añadir franja · Lunes" }));
    fireEvent.change(screen.getByLabelText("Inicio · Lunes 2"), { target: { value: "20:00" } });
    fireEvent.change(screen.getByLabelText("Término · Lunes 2"), { target: { value: "21:00" } });
    await review();
    expect(lastPayload().slots).toHaveLength(4);
    expect(lastPayload().slots).toContainEqual({ dayOfWeek: 5, startsAt: "17:00", endsAt: "19:00", locationId: "location-2" });
    expect(lastPayload().slots).toContainEqual({ dayOfWeek: 1, startsAt: "20:00", endsAt: "21:00", locationId: "location-1" });
  });

  it("updates the end time from duration and supports one-off overnight classes", async () => {
    renderWorkspace();
    goToWhen();
    fireEvent.click(screen.getByRole("radio", { name: "Una sola fecha" }));
    fireEvent.change(screen.getByLabelText("Hora de inicio"), { target: { value: "23:30" } });
    fireEvent.click(screen.getByRole("button", { name: "90 min" }));
    expect((screen.getByLabelText("Hora de término") as HTMLInputElement).value).toBe("01:00");
    expect((screen.getByLabelText("Fecha de término") as HTMLInputElement).value).toBe("2026-10-20");
    await review();
    expect(lastPayload().mode).toBe("once");
    expect(lastPayload().slots).toEqual([{ dayOfWeek: 1, date: "2026-10-19", endDate: "2026-10-20", startsAt: "23:30", endsAt: "01:00", locationId: "location-1" }]);
  });

  it("offers saving the weekly routine without publishing sessions", async () => {
    renderWorkspace();
    goToWhen();
    fireEvent.click(screen.getByRole("button", { name: "Solo guardar horarios" }));
    const save = await screen.findByRole("button", { name: "Guardar horarios sin publicar" });
    await waitFor(() => expect(save.hasAttribute("disabled")).toBe(false));
    fireEvent.submit(save.closest("form")!);
    await screen.findByRole("heading", { name: "Programación guardada" });
    const data: FormData = actions.saveProgrammingAction.mock.calls[0][1];
    expect(data.get("intent")).toBe("save");
    expect(lastPayload(actions.saveProgrammingAction).slots).toHaveLength(3);
  });

  it("honors legacy one-off navigation after hydration", () => {
    window.history.replaceState(null, "", "#one-off-heading");
    renderWorkspace();
    goToWhen();
    expect((screen.getByRole("radio", { name: "Una sola fecha" }) as HTMLInputElement).checked).toBe(true);
  });

  it("requires explicit conflict confirmation after showing the affected activity", async () => {
    actions.previewProgrammingAction.mockResolvedValue({
      error: null, message: null, preview: { newCount: 6, existingCount: 0, occurrences: [], conflicts: [{ message: "Pilates: lunes 18:30–19:30, Sala Sur" }] },
    });
    renderWorkspace();
    goToWhen();
    await review();
    const button = screen.getByRole("button", { name: "Publicar clases" });
    expect(button.hasAttribute("disabled")).toBe(true);
    expect(screen.getByText("Pilates: lunes 18:30–19:30, Sala Sur")).toBeTruthy();
    fireEvent.click(screen.getByRole("checkbox", { name: /Revisé estos cruces/ }));
    expect(button.hasAttribute("disabled")).toBe(false);
    fireEvent.submit(button.closest("form")!);
    await screen.findByRole("heading", { name: "Programación guardada" });
    expect(lastPayload(actions.saveProgrammingAction).allowConflict).toBe(true);
  });

  it("preserves the operation identity when retrying an uncertain failure", async () => {
    actions.saveProgrammingAction.mockResolvedValueOnce({ error: "No se pudo confirmar la respuesta. Reintenta.", message: null });
    renderWorkspace();
    goToWhen();
    await review();
    fireEvent.submit(screen.getByRole("button", { name: "Publicar clases" }).closest("form")!);
    await screen.findByRole("alert");
    const first = lastPayload(actions.saveProgrammingAction).operationId;
    fireEvent.submit(screen.getByRole("button", { name: "Publicar clases" }).closest("form")!);
    await screen.findByRole("heading", { name: "Programación guardada" });
    expect(lastPayload(actions.saveProgrammingAction).operationId).toBe(first);
  });

  it("surfaces browser network failures and allows retrying the same operation", async () => {
    actions.saveProgrammingAction.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    renderWorkspace();
    goToWhen();
    await review();
    fireEvent.submit(screen.getByRole("button", { name: "Publicar clases" }).closest("form")!);
    expect((await screen.findByRole("alert")).textContent).toContain("Comprueba tu conexión");
    const first = lastPayload(actions.saveProgrammingAction).operationId;
    fireEvent.submit(screen.getByRole("button", { name: "Publicar clases" }).closest("form")!);
    await screen.findByRole("heading", { name: "Programación guardada" });
    expect(lastPayload(actions.saveProgrammingAction).operationId).toBe(first);
  });

  it("requires another preview after editing and resets conflict approval", async () => {
    renderWorkspace();
    goToWhen();
    await review();
    const first = lastPayload().operationId;
    fireEvent.click(screen.getByRole("button", { name: "Atrás" }));
    fireEvent.change(screen.getByLabelText("Hora de inicio"), { target: { value: "17:00" } });
    expect(screen.queryByRole("button", { name: "Publicar clases" })).toBeNull();
    await review();
    expect(lastPayload().operationId).not.toBe(first);
    expect(lastPayload().allowConflict).toBe(false);
  });

  it("does not enable preview without days and shows invalid per-day times", () => {
    renderWorkspace();
    goToWhen();
    for (const name of ["Lunes", "Miércoles", "Viernes"]) fireEvent.click(screen.getByRole("button", { name }));
    expect(screen.getByRole("button", { name: "Revisar para publicar" }).hasAttribute("disabled")).toBe(true);
    expect(screen.getByRole("alert").textContent).toContain("al menos un día");
    fireEvent.click(screen.getByRole("button", { name: "Martes" }));
    fireEvent.change(screen.getByLabelText("Hora de término"), { target: { value: "17:00" } });
    expect(screen.getByRole("button", { name: "Revisar para publicar" }).hasAttribute("disabled")).toBe(true);
  });

  it("preserves the draft when switching maintenance tabs and stepping backwards", async () => {
    renderWorkspace();
    goToWhen();
    fireEvent.change(screen.getByLabelText("Hora de inicio"), { target: { value: "17:00" } });
    await selectTab("Ubicaciones");
    await selectTab("Programar");
    expect((screen.getByLabelText("Hora de inicio") as HTMLInputElement).value).toBe("17:00");
    fireEvent.click(screen.getByRole("button", { name: "Atrás" }));
    expect((screen.getByRole("combobox", { name: "Lugar" }) as HTMLSelectElement).value).toBe("location-1");
  });

  it("creates disciplines and classes without navigating away and auto-selects both", async () => {
    renderWorkspace({ disciplines: [], classes: [], templates: [] });
    fireEvent.change(screen.getByRole("textbox", { name: "Nombre de la disciplina" }), { target: { value: "Pilates" } });
    fireEvent.submit(screen.getByRole("button", { name: "Crear disciplina" }).closest("form")!);
    await waitFor(() => expect((screen.getByRole("combobox", { name: "Disciplina" }) as HTMLSelectElement).value).toBe("Pilates"));
    fireEvent.change(screen.getByRole("textbox", { name: "Nombre de la clase" }), { target: { value: "Yoga nueva" } });
    fireEvent.submit(screen.getByRole("button", { name: "Crear clase" }).closest("form")!);
    await waitFor(() => expect((screen.getByRole("combobox", { name: "Clase" }) as HTMLSelectElement).value).toBe("new-class"));
    expect(window.location.pathname).toBe("/dashboard/schedule/programming");
  });

  it("creates and selects a place using a supported gym type", async () => {
    renderWorkspace({ locations: [] });
    selectClass();
    fireEvent.change(screen.getByRole("textbox", { name: "Nombre del lugar" }), { target: { value: "Sala Nueva" } });
    fireEvent.submit(screen.getByRole("button", { name: "Añadir ubicación" }).closest("form")!);
    await waitFor(() => expect((screen.getByRole("combobox", { name: "Lugar" }) as HTMLSelectElement).value).toBe("new-location"));
    const data: FormData = actions.createLocationAction.mock.calls[0][1];
    expect(data.get("type")).toBe("external_gym");
  });

  it("preserves catalog form values on failure", async () => {
    actions.createClassTemplateAction.mockResolvedValueOnce({ error: "La disciplina ya no está activa.", message: null });
    renderWorkspace({ classes: [], templates: [] });
    fireEvent.change(screen.getByRole("combobox", { name: "Deporte o disciplina" }), { target: { value: "discipline-1" } });
    fireEvent.change(screen.getByRole("textbox", { name: "Nombre de la clase" }), { target: { value: "Mi clase" } });
    fireEvent.change(screen.getByRole("spinbutton", { name: "Capacidad" }), { target: { value: "20" } });
    fireEvent.submit(screen.getByRole("button", { name: "Crear clase" }).closest("form")!);
    await screen.findByRole("alert");
    expect((screen.getByRole("textbox", { name: "Nombre de la clase" }) as HTMLInputElement).value).toBe("Mi clase");
    expect((screen.getByRole("spinbutton", { name: "Capacidad" }) as HTMLInputElement).value).toBe("20");
  });

  it("keeps classes usable when their discipline is archived", () => {
    renderWorkspace({ disciplines: [] });
    selectClass();
    expect(screen.getByRole("combobox", { name: "Lugar" })).toBeTruthy();
  });

  it.each([
    ["#class-catalog", "Clases"], ["#class-template-setup", "Clases"], ["#class-setup", "Clases"],
    ["#location-setup", "Ubicaciones"], ["#one-off-heading", "Programar"], ["#recurring-heading", "Horarios"],
  ])("preserves the legacy deep link %s", (hash, label) => {
    window.history.replaceState(null, "", hash);
    renderWorkspace();
    expect(screen.getByRole("tab", { name: label }).getAttribute("aria-selected")).toBe("true");
  });

  it("groups three weekly records and reviews them together for publication", async () => {
    renderWorkspace();
    await selectTab("Horarios");
    expect(screen.getAllByRole("button", { name: "Revisar y publicar esta rutina" })).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: "Revisar y publicar esta rutina" }));
    await screen.findByRole("button", { name: "Revisar para publicar" });
    await review();
    expect(lastPayload().slots).toHaveLength(3);
    expect(lastPayload().classTemplateId).toBe("template-1");
    expect(lastPayload().instructorMembershipId).toBe("membership-1");
  });

  it("preserves another instructor when an owner publishes their existing routine", async () => {
    renderWorkspace({ instructorMembershipId: "owner-1", canManageOtherInstructors: true });
    await selectTab("Horarios");
    fireEvent.click(screen.getByRole("button", { name: "Revisar y publicar esta rutina" }));
    await screen.findByRole("button", { name: "Revisar para publicar" });
    await review();
    expect(lastPayload().instructorMembershipId).toBe("membership-1");
  });

  it("does not offer another instructor's routine to a regular instructor", async () => {
    renderWorkspace({ instructorMembershipId: "different-instructor" });
    await selectTab("Horarios");
    expect(screen.queryByRole("button", { name: "Revisar y publicar esta rutina" })).toBeNull();
    expect(screen.getByText(/Esta rutina pertenece a otro instructor/)).toBeTruthy();
  });

  it("separates instructors, places and timezones when grouping", () => {
    const first = ready.schedules[0];
    expect(groupProgrammingSchedules([...ready.schedules,
      { ...first, id: "other-instructor", instructorMembershipId: "other" },
      { ...first, id: "other-location", locationId: "other" },
      { ...first, id: "other-timezone", timezone: "America/Lima" },
    ])).toHaveLength(4);
  });

  it("handles browser navigation without clearing the draft", async () => {
    renderWorkspace();
    selectClass();
    await act(async () => {
      window.history.replaceState(null, "", "#location-setup");
      window.dispatchEvent(new PopStateEvent("popstate"));
    });
    expect(screen.getByRole("heading", { name: "Tus lugares" })).toBeTruthy();
    await selectTab("Programar");
    expect(screen.getByRole("combobox", { name: "Lugar" })).toBeTruthy();
  });
});
