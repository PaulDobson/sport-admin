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
  if (width < 1024) {
    await expect(page.getByRole("button", { name: /Colapsar navegación|Expandir navegación/ })).toBeHidden();
  }
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

  test("collapses the desktop sidebar while preserving navigation and focus", async ({ page }) => {
    test.skip((page.viewportSize()?.width ?? 0) < 1024, "Desktop sidebar only");
    await signIn(page);
    const sidebar = page.getByRole("complementary", { name: "Navegación principal" });
    const expandedWidth = await sidebar.evaluate((element) => element.getBoundingClientRect().width);
    const toggle = page.getByRole("button", { name: "Colapsar navegación" });
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    await toggle.focus();
    await page.keyboard.press("Enter");
    const expand = page.getByRole("button", { name: "Expandir navegación" });
    await expect(expand).toBeFocused();
    await expect(expand).toHaveAttribute("aria-expanded", "false");
    await expect(sidebar).toHaveCSS("width", "80px");
    expect(expandedWidth).toBeGreaterThan(80);

    const disciplines = sidebar.getByRole("link", { name: "Disciplinas", exact: true });
    await disciplines.focus();
    await expect(page.getByRole("tooltip", { name: "Disciplinas", exact: true })).toBeVisible();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/dashboard\/disciplines$/);
    await expect(disciplines).toHaveAttribute("aria-current", "page");
    await expect(sidebar).toHaveCSS("width", "80px");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

    await expand.focus();
    await page.keyboard.press("Space");
    await expect(page.getByRole("button", { name: "Colapsar navegación" })).toBeFocused();
    await expect(sidebar).toHaveCSS("width", `${expandedWidth}px`);
  });
});
