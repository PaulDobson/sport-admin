import { expect, test, type Page } from "@playwright/test";

const email = process.env.E2E_EMAIL;
const password = process.env.E2E_PASSWORD;

async function expectNoOverflow(page: Page) {
  const dimensions = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    content: document.documentElement.scrollWidth,
  }));
  expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport);
}

test.describe("Agenda navigation and layout", () => {
  test.skip(!email || !password, "Set E2E_EMAIL and E2E_PASSWORD for authenticated coverage");

  test.beforeEach(async ({ page }) => {
    await page.goto("/log-in");
    await page.getByLabel("Correo electronico").fill(email ?? "");
    await page.getByLabel("Contraseña", { exact: true }).fill(password ?? "");
    await page.getByRole("button", { name: "Ingresar a mi cuenta" }).click();
    await expect(page).toHaveURL(/\/dashboard(?:\?.*)?$/);
  });

  test("keeps sessions and programming accessible at both target widths", async ({ page }) => {
    for (const width of [375, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/dashboard/schedule");
      const secondary = page.getByRole("navigation", { name: "Secciones de Agenda", exact: true });
      await expect(secondary.getByRole("link", { name: "Sesiones", exact: true })).toHaveAttribute("aria-current", "page");
      await expect(page.getByRole("combobox", { name: "Ubicación" })).toBeVisible();
      await expectNoOverflow(page);
      const programming = secondary.getByRole("link", { name: "Programación", exact: true });
      if (await programming.count()) {
        await programming.click();
        const tasks = page.getByRole("tablist", { name: "Acciones de programación" });
        await expect(tasks).toBeVisible();
        await expect(page.getByRole("tabpanel")).toHaveCount(1);
        const tabBounds = await tasks.boundingBox();
        expect(tabBounds).not.toBeNull();
        expect(tabBounds!.y + tabBounds!.height).toBeLessThan(width < 1024 ? 450 : 600);
        await page.getByRole("tab", { name: "Clases", exact: true }).click();
        const createClass = page.getByText("Crear una nueva clase", { exact: true });
        if (!(await createClass.evaluate((element) => element.closest("details")?.open))) {
          await createClass.click();
        }
        await expect(page.getByRole("heading", { name: "Crear clase", exact: true })).toBeVisible();
        await page.getByRole("tab", { name: "Ubicaciones", exact: true }).click();
        await expect(page.getByRole("button", { name: "Añadir ubicación", exact: true })).toBeVisible();
        await expect(page.getByRole("tabpanel")).toHaveCount(1);
        await page.getByRole("button", { name: "Añadir ubicación", exact: true }).scrollIntoViewIfNeeded();
        const locationAction = await page.getByRole("button", { name: "Añadir ubicación", exact: true }).boundingBox();
        expect(locationAction).not.toBeNull();
        expect(locationAction!.y + locationAction!.height).toBeLessThan(800);
        await page.getByRole("tab", { name: "Programar", exact: true }).click();
        await expect(page.getByRole("heading", { name: "Programar clase", exact: true })).toBeVisible();
        await expect(secondary.getByRole("link", { name: "Programación", exact: true })).toHaveAttribute("aria-current", "page");
        await expectNoOverflow(page);
      }
    }
  });

  test("opens class editing and deletion safely without mutating records", async ({ page }) => {
    await page.goto("/dashboard/schedule/programming#class-template-setup");
    const catalog = page.getByRole("region", { name: "Tus clases", exact: true });
    await expect(catalog).toBeVisible();
    const edit = catalog.getByRole("button", { name: /^Editar / }).first();
    test.skip(await edit.count() === 0, "The academy needs a class for editor coverage");
    for (const width of [375, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      await edit.click();
      const dialog = page.getByRole("dialog", { name: "Editar clase", exact: true });
      await expect(dialog).toBeVisible();
      await expect(dialog.getByRole("textbox", { name: "Nombre de la clase" })).toBeFocused();
      await expect(dialog.getByRole("button", { name: "Guardar cambios", exact: true })).toBeDisabled();
      await expect(dialog.getByText(/Las sesiones ya publicadas conservan sus cupos/)).toBeVisible();
      await expectNoOverflow(page);
      await page.keyboard.press("Escape");
      await expect(dialog).toBeHidden();
      await expect(edit).toBeFocused();
    }
    const remove = catalog.getByRole("button", { name: /^Eliminar / }).filter({ visible: true });
    const available = await remove.evaluateAll((buttons) => buttons.findIndex((button) => !button.hasAttribute("disabled")));
    if (available >= 0) {
      await remove.nth(available).click();
      const confirmation = page.getByRole("dialog", { name: "Eliminar clase", exact: true });
      await expect(confirmation.getByRole("button", { name: "Cancelar", exact: true })).toBeFocused();
      await confirmation.getByRole("button", { name: "Cancelar", exact: true }).click();
      await expect(confirmation).toBeHidden();
    }
  });

  test("configures a flexible weekly routine at both widths without publishing", async ({ page }) => {
    await page.goto("/dashboard/schedule/programming");
    const classSelect = page.getByRole("combobox", { name: "Clase", exact: true });
    test.skip(await classSelect.locator("option").count() < 2, "The academy needs a class for scheduling coverage");
    for (const width of [375, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      await classSelect.selectOption({ index: 1 });
      await page.getByRole("button", { name: "Continuar", exact: true }).click();
      const location = page.getByRole("combobox", { name: "Lugar", exact: true });
      test.skip(await location.locator("option").count() < 2, "The academy needs a place for scheduling coverage");
      await location.selectOption({ index: 1 });
      await page.getByRole("button", { name: "Continuar", exact: true }).click();
      await expect(page.getByRole("button", { name: "Lunes", exact: true })).toHaveAttribute("aria-pressed", "true");
      await expect(page.getByRole("button", { name: "Miércoles", exact: true })).toHaveAttribute("aria-pressed", "true");
      await expect(page.getByRole("button", { name: "Viernes", exact: true })).toHaveAttribute("aria-pressed", "true");
      const customize = page.getByRole("button", { name: "Personalizar horario por día", exact: true });
      if (await customize.count()) await customize.click();
      await page.getByLabel("Inicio · Viernes 1").fill("17:00");
      await expect(page.getByLabel("Inicio · Viernes 1")).toHaveValue("17:00");
      await expect(page.getByRole("button", { name: "Publicar clases", exact: true })).toHaveCount(0);
      await expectNoOverflow(page);
      await page.getByRole("button", { name: "Atrás", exact: true }).click();
      await page.getByRole("button", { name: "Atrás", exact: true }).click();
    }
  });

  test("keeps Agenda active and offers a mobile return from an existing session", async ({ page }) => {
    await page.goto("/dashboard/schedule");
    const session = page.getByRole("link", { name: /^Tomar asistencia de / }).first();
    test.skip(await session.count() === 0, "The active tenant needs an open session for attendance coverage");
    await session.click();
    for (const width of [375, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      const back = page.getByRole("main").getByRole("link", { name: "Volver a sesiones", exact: true });
      await expect(back).toBeVisible();
      await expect(back).toHaveAttribute("href", "/dashboard/schedule");
      const navigation = page.getByRole("navigation", { name: width < 1024 ? "Navegación móvil" : "Secciones", exact: true });
      await expect(navigation.getByRole("link", { name: width < 1024 ? "Agenda" : "Sesiones", exact: true })).toHaveAttribute("aria-current", "page");
      await expectNoOverflow(page);
    }
  });
});
