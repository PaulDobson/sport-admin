import { expect, test } from "@playwright/test";

const email = process.env.E2E_EMAIL;
const password = process.env.E2E_PASSWORD;

test.describe("Discipline catalog experience", () => {
  test.skip(!email || !password, "Set E2E_EMAIL and E2E_PASSWORD for authenticated coverage");

  test.beforeEach(async ({ page }) => {
    await page.goto("/log-in");
    await page.getByLabel("Correo electronico").fill(email ?? "");
    await page.getByLabel("Contraseña", { exact: true }).fill(password ?? "");
    await page.getByRole("button", { name: "Ingresar a mi cuenta" }).click();
    await expect(page).toHaveURL(/\/dashboard(?:\?.*)?$/);
  });

  test("keeps catalog navigation and dialog accessible on mobile and desktop without mutating data", async ({ page }) => {
    for (const width of [375, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/dashboard/schedule");
      const navigation = page.getByRole("navigation", { name: "Secciones de Agenda", exact: true });
      await navigation.getByRole("link", { name: "Disciplinas", exact: true }).click();
      await expect(page).toHaveURL(/\/dashboard\/disciplines$/);
      await expect(navigation.getByRole("link", { name: "Disciplinas", exact: true })).toHaveAttribute("aria-current", "page");
      await expect(page.getByRole("textbox", { name: "Buscar disciplina" })).toBeVisible();
      await expect(page.getByRole("combobox", { name: "Estado", exact: true })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);

      const create = page.getByRole("button", { name: "Nueva disciplina", exact: true }).first();
      if (await create.count()) {
        await create.click();
        const dialog = page.getByRole("dialog", { name: "Nueva disciplina" });
        await expect(dialog).toBeVisible();
        await expect(dialog.getByRole("textbox", { name: "Nombre de la disciplina" })).toBeFocused();
        expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
        await page.keyboard.press("Escape");
        await expect(dialog).not.toBeVisible();
        await expect(create).toBeFocused();
      }
    }
  });
});
