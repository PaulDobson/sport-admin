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

async function expectShellNavigation(page: Page) {
  const width = page.viewportSize()?.width ?? 0;
  const navigation =
    width >= 1024
      ? page.getByRole("navigation", { name: "Secciones" })
      : page.getByRole("navigation", { name: "Navegación móvil" });
  await expect(navigation).toBeVisible();
}

test.describe("authenticated product shell", () => {
  test.skip(
    !hasCredentials,
    "Set E2E_EMAIL and E2E_PASSWORD for authenticated coverage",
  );

  test("keeps navigation, account context, and profile access available", async ({
    page,
  }) => {
    await signIn(page);
    await expectShellNavigation(page);
    await expect(page.getByRole("button", { name: /Cuenta de/ })).toBeVisible();
    await page.getByRole("button", { name: /Cuenta de/ }).click();
    await expect(
      page.getByRole("menu", { name: "Menú de cuenta" }),
    ).toBeVisible();
    await expect(
      page.getByRole("menuitem", { name: "Perfil y cuenta" }),
    ).toBeVisible();
  });

  test("keeps shell navigation available while offline", async ({
    page,
    context,
  }) => {
    await signIn(page);
    await expectShellNavigation(page);
    await context.setOffline(true);
    await page.evaluate(() => window.dispatchEvent(new Event("offline")));
    await expect(page.getByText("Sin conexión")).toBeVisible();
    await expectShellNavigation(page);
    await context.setOffline(false);
  });
});
