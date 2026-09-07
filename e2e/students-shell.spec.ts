import { expect, test, type Page } from "@playwright/test";

const email = process.env.E2E_EMAIL;
const password = process.env.E2E_PASSWORD;
const hasCredentials = Boolean(email && password);

async function signIn(page: Page) {
  await page.goto("/log-in");
  await page.getByLabel("Correo electronico").fill(email ?? "");
  await page.getByLabel("Contraseña").fill(password ?? "");
  await page.getByRole("button", { name: "Ingresar" }).click();
  await expect(page).toHaveURL(/\/dashboard(?:\?.*)?$/);
}

async function expectResponsiveNavigation(page: Page) {
  const width = page.viewportSize()?.width ?? 0;
  await expect(
    width >= 1024
      ? page.getByRole("navigation", { name: "Secciones" })
      : page.getByRole("navigation", { name: "Navegación móvil" }),
  ).toBeVisible();
}

test.describe("student administration shell", () => {
  test.skip(
    !hasCredentials,
    "Set E2E_EMAIL and E2E_PASSWORD for authenticated coverage",
  );

  test("uses the full work area without a redundant context rail", async ({
    page,
  }) => {
    await signIn(page);
    await page.goto("/dashboard/students");

    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "Administración de alumnos",
    );
    await expectResponsiveNavigation(page);
    await expect(
      page.getByRole("complementary", { name: "Contexto operativo" }),
    ).toHaveCount(0);

    const dimensions = await page.evaluate(() => ({
      viewportWidth: document.documentElement.clientWidth,
      contentWidth: document.documentElement.scrollWidth,
    }));
    expect(dimensions.contentWidth).toBeLessThanOrEqual(
      dimensions.viewportWidth,
    );
  });
});
