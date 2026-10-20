import { expect, test, type Locator, type Page } from "@playwright/test";
import { startStudentFixture } from "./fixtures/student-server.mjs";

const base = "http://127.0.0.1:4175";
const studentId = "20000000-0000-4000-8000-000000000001";
test.describe.configure({ mode: "serial" });
let fixture: Awaited<ReturnType<typeof startStudentFixture>>;
test.beforeAll(async ({ browserName }, info) => {
  test.skip(browserName !== "chromium" || info.project.name !== "desktop-chromium", "Six viewport sizes are covered in one Chromium project");
  fixture = await startStudentFixture();
});
test.afterAll(async () => { await fixture?.close(); });

async function noOverflow(page: Page, width: number) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  const controls = page.locator("main a, main button, main input:not([type=hidden]):not([type=checkbox]), main select, main summary");
  let lastVisible: Locator | undefined;
  for (const control of await controls.all()) {
    if (!(await control.isVisible())) continue;
    lastVisible = control;
    const box = await control.evaluate(element => ({ height: (element as HTMLElement).offsetHeight, width: (element as HTMLElement).offsetWidth }));
    expect(box.height).toBeGreaterThanOrEqual(44);
    expect(box.width).toBeGreaterThanOrEqual(44);
  }
  const bottomNavigation = page.getByRole("navigation", { name: "Navegación móvil" });
  if (lastVisible && await bottomNavigation.isVisible()) {
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    const action = await lastVisible.boundingBox();
    const navigation = await bottomNavigation.boundingBox();
    expect(action && navigation && action.y + action.height <= navigation.y).toBe(true);
  }
}

test("renders the actual task pages at six widths without overflow or inaccessible controls", async ({ page }) => {
  for (const width of [320, 375, 390, 768, 1280, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`${base}/dashboard/students?status=all`);
    await expect(page.getByRole("heading", { name: "Alumnos", exact: true })).toBeVisible();
    await expect(page.getByRole("table")).toBeVisible({ visible: width >= 768 });
    await expect(page.getByRole("list", { name: "Alumnos", exact: true })).toBeVisible({ visible: width < 768 });
    await noOverflow(page, width);
    await page.goto(`${base}/dashboard/students/new`);
    await expect(page.getByLabel("Nombre completo")).toBeVisible();
    await page.getByText("Perfil del alumno", { exact: true }).click();
    await page.getByText("Contacto de emergencia", { exact: true }).click();
    await page.getByText("Información de salud", { exact: true }).click();
    await noOverflow(page, width);
    for (const section of ["summary", "membership", "health", "privacy"]) {
      await page.goto(`${base}/dashboard/students/${studentId}?section=${section}`);
      await expect(page.getByRole("heading", { name: /Ana Bravo/ })).toBeVisible();
      await noOverflow(page, width);
    }
    await page.goto(`${base}/dashboard/students/${studentId}/edit`);
    await expect(page.getByLabel("Nombre completo")).toHaveValue(/Ana Bravo/);
    await noOverflow(page, width);
  }
});

test("supports keyboard archive confirmation, cancel focus and visible failure", async ({ page }) => {
  await page.goto(`${base}/dashboard/students`);
  const trigger = page.getByRole("button", { name: /Archivar Ana/ });
  await trigger.focus();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog", { name: /Archivar a Ana/ });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Cancelar" })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(dialog.getByRole("button", { name: "Confirmar archivado" })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(dialog.getByRole("button", { name: "Cancelar" })).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(dialog.getByRole("button", { name: "Confirmar archivado" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
  await trigger.click();
  await dialog.getByRole("button", { name: "Confirmar archivado" }).click();
  await expect(dialog.getByRole("alert")).toHaveText(/no se pudo archivar/);
  await dialog.getByRole("button", { name: "Cancelar" }).click();
});

test("keeps invalid optional fields accessible, preserves failed input and protects navigation", async ({ page }) => {
  await page.goto(`${base}/dashboard/students/new?search=Ana&page=2`);
  await page.getByLabel("Nombre completo").fill("Ana de prueba");
  await page.getByText("Perfil del alumno", { exact: true }).click();
  await page.getByLabel("URL de la foto").fill("invalid-url");
  await page.getByText("Perfil del alumno", { exact: true }).click();
  await page.getByRole("button", { name: "Crear alumno" }).click();
  await expect(page.getByLabel("URL de la foto")).toBeVisible();
  await expect(page.getByLabel("URL de la foto")).toBeFocused();
  await page.getByLabel("URL de la foto").fill("");
  await page.getByRole("button", { name: "Crear alumno" }).click();
  await expect(page.getByRole("alert")).toHaveText(/revisa los datos/);
  await expect(page.getByLabel("Nombre completo")).toHaveValue("Ana de prueba");
  page.once("dialog", dialog => dialog.dismiss());
  await page.getByRole("link", { name: "Cancelar", exact: true }).click();
  await expect(page).toHaveURL(/\/students\/new/);
  page.once("dialog", dialog => dialog.accept());
  await expect(page.getByRole("link", { name: "Cancelar", exact: true })).toHaveAttribute("href", "/dashboard/students?search=Ana&status=active&page=2&pageSize=10");
  await page.getByRole("link", { name: "Cancelar", exact: true }).click();
  await expect(page).toHaveURL(/\/students\?search=Ana&status=active&page=1&pageSize=10/);
});

test("restricts assistant surfaces and separates blocked health from absent data", async ({ page }) => {
  await page.goto(`${base}/dashboard/students?role=assistant`);
  await expect(page.getByRole("link", { name: "Nuevo alumno" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Archivar/ })).toHaveCount(0);
  await page.goto(`${base}/dashboard/students/${studentId}?role=assistant&section=privacy`);
  await expect(page.getByRole("link", { name: "Privacidad", exact: true })).toHaveCount(0);
  await page.goto(`${base}/dashboard/students/${studentId}?section=health&consent=no`);
  await expect(page.getByRole("heading", { name: "Datos de salud bloqueados" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Guardar alerta" })).toHaveCount(0);
});
