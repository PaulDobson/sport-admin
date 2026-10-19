import { expect, test } from "@playwright/test";
import { startGymFixture } from "./fixtures/gym-server.mjs";

let fixture: Awaited<ReturnType<typeof startGymFixture>>;
test.beforeAll(async () => { fixture = await startGymFixture(); });
test.afterAll(async () => { await fixture?.close(); });
const url = "http://127.0.0.1:4178/dashboard/gym";

test("actual gym page is mobile first and usable at six viewport widths", async ({ page }) => {
  for (const width of [320, 375, 390, 768, 1280, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(url);
    await expect(page.getByRole("heading", { name: "Datos del gimnasio" })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    for (const name of ["Identidad", "Ubicación", "Contacto principal"]) {
      const group = page.getByRole("group", { name, exact: true });
      const heading = group.getByRole("heading", { name, exact: true });
      const icon = await heading.locator("svg").boundingBox();
      const text = await heading.locator("span").boundingBox();
      const card = await group.locator("section").boundingBox();
      expect(icon && text && card).toBeTruthy();
      expect(Math.abs(icon!.y + icon!.height / 2 - (text!.y + text!.height / 2))).toBeLessThanOrEqual(1);
      expect(icon!.y - card!.y).toBeGreaterThanOrEqual(16);
      expect(icon!.width).toBeCloseTo(16, 3);
      expect(icon!.height).toBeCloseTo(16, 3);
    }
    for (const input of await page.locator('main input:not([type="hidden"]), main button').all()) {
      const size = await input.evaluate(element => ({
        height: (element as HTMLElement).offsetHeight,
        width: (element as HTMLElement).offsetWidth,
      }));
      expect(size.height).toBeGreaterThanOrEqual(44);
      expect(size.width).toBeGreaterThanOrEqual(44);
    }
    await page.getByRole("button", { name: "Cuenta de Ana Silva" }).click();
    await expect(page.getByRole("menuitem", { name: "Mi gimnasio" })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await page.keyboard.press("Escape");
    await expect(page.getByRole("button", { name: "Cuenta de Ana Silva" })).toBeFocused();
    if (width >= 1024) await expect(page.getByRole("link", { name: "Mi gimnasio" })).toHaveAttribute("aria-current", "page");
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    const save = await page.getByRole("button", { name: "Guardar cambios" }).boundingBox();
    if (width < 1024) {
      const navigation = await page.getByRole("navigation", { name: "Navegación móvil" }).boundingBox();
      expect(save && navigation && save.y + save.height <= navigation.y).toBe(true);
    }
  }
});

test("edits all fields, persists reloads and allows clearing optional data", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(url);
  await page.getByLabel("Nombre del gimnasio").fill("Academia Nueva");
  await page.getByLabel("Dirección", { exact: true }).fill("Av. Central 123");
  await page.getByLabel("Nombre del contacto principal").fill("Ana Silva");
  await page.getByLabel("Email del contacto").fill("ana@example.cl");
  await page.getByLabel("Teléfono").fill("+56 9 1234 5678");
  await page.getByLabel("Ciudad").fill("Santiago");
  await page.getByLabel("Región").fill("Metropolitana");
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(page.getByRole("status")).toHaveText("Datos del gimnasio actualizados.");
  await page.reload();
  await expect(page.getByLabel("Nombre del gimnasio")).toHaveValue("Academia Nueva");
  await expect(page.getByLabel("Email del contacto")).toHaveValue("ana@example.cl");
  await expect(page.getByLabel("Ciudad")).toHaveValue("Santiago");
  for (const label of ["Dirección", "Nombre del contacto principal", "Email del contacto", "Teléfono", "Ciudad", "Región"]) await page.getByLabel(label, { exact: true }).fill("");
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(page.getByRole("status")).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Ciudad")).toHaveValue("");
  await expect(page.getByLabel("Nombre del gimnasio")).toHaveValue("Academia Nueva");
});

test("preserves failed input and supports keyboard retry without false success", async ({ page }) => {
  await page.goto(url);
  await page.getByLabel("Ciudad").fill("Valparaíso");
  await page.getByLabel("Email del contacto").fill("fail@example.cl");
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(page.getByRole("alert")).toContainText("No pudimos guardar");
  await expect(page.getByRole("alert")).toBeFocused();
  await expect(page.getByLabel("Ciudad")).toHaveValue("Valparaíso");
  await expect(page.getByRole("status")).toHaveCount(0);
  await page.getByLabel("Email del contacto").fill("contacto@example.cl");
  await page.getByRole("button", { name: "Guardar cambios" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("status")).toBeVisible();
});
