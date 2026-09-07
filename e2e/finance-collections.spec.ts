import { expect, test, type Page } from "@playwright/test";

const email = process.env.E2E_EMAIL;
const password = process.env.E2E_PASSWORD;
const hasCredentials = Boolean(email && password);
const planName = `E2E Mensual ${Date.now()}`;

async function signIn(page: Page) {
  await page.goto("/log-in");
  await page.getByLabel("Correo electronico").fill(email ?? "");
  await page.getByLabel("Contraseña").fill(password ?? "");
  await page.getByRole("button", { name: "Ingresar" }).click();
  await expect(page).toHaveURL(/\/dashboard(?:\?.*)?$/);
}

test.describe("finance collections", () => {
  test.skip(
    !hasCredentials,
    "Set E2E_EMAIL and E2E_PASSWORD for authenticated coverage",
  );

  test("creates a plan, collects it in two partial payments and clears the pending item", async ({
    page,
  }) => {
    await signIn(page);
    await page.goto("/dashboard/finance?section=plans");

    await page.getByRole("button", { name: "Nuevo plan" }).click();
    const planSheet = page.getByRole("dialog");
    await planSheet.getByLabel("Nombre").fill(planName);
    await planSheet.getByLabel("Precio").fill("30000");
    await planSheet.getByLabel("Gracia (días)").fill("0");
    await planSheet.getByRole("button", { name: "Crear plan" }).click();
    await expect(planSheet.getByText("Plan creado.")).toBeVisible();
    await planSheet.getByRole("button", { name: "Cerrar" }).click();
    await expect(page.getByText(planName)).toBeVisible();

    await page.goto("/dashboard/finance?section=collections");
    const firstPending = page.getByRole("listitem").first();
    test.skip(
      (await page.getByRole("listitem").count()) === 0,
      "No pending collections available in this environment",
    );

    const studentName =
      (await firstPending.getByRole("link").first().textContent()) ?? "";

    await firstPending.getByRole("button", { name: "Cobrar" }).click();
    const paymentSheet = page.getByRole("dialog");
    const balance = Number(
      (await paymentSheet.getByLabel("Monto").inputValue()) || "0",
    );
    const firstHalf = Math.floor(balance / 2);
    await paymentSheet.getByLabel("Monto").fill(String(firstHalf));
    await paymentSheet.getByLabel("Método").selectOption("cash");
    await paymentSheet.getByRole("button", { name: "Registrar pago" }).click();
    await expect(paymentSheet.getByText("Pago registrado.")).toBeVisible();
    await paymentSheet.getByRole("button", { name: "Cerrar" }).click();

    await page.reload();
    const remaining = page
      .getByRole("listitem")
      .filter({ hasText: studentName.trim() })
      .first();
    await remaining.getByRole("button", { name: "Cobrar" }).click();
    const secondSheet = page.getByRole("dialog");
    const rest = await secondSheet.getByLabel("Monto").inputValue();
    expect(Number(rest)).toBeGreaterThan(0);
    await secondSheet.getByLabel("Método").selectOption("transfer");
    await secondSheet.getByRole("button", { name: "Registrar pago" }).click();
    await expect(secondSheet.getByText("Pago registrado.")).toBeVisible();
    await secondSheet.getByRole("button", { name: "Cerrar" }).click();

    await page.reload();
    await expect(
      page.getByRole("listitem").filter({ hasText: studentName.trim() }),
    ).toHaveCount(0);
  });

  test("keeps sections and collection sheets reachable and dismissible with the keyboard", async ({
    page,
  }) => {
    await signIn(page);
    await page.goto("/dashboard/finance");

    const sections = page.getByRole("navigation", {
      name: "Secciones de finanzas",
    });
    await expect(sections).toBeVisible();
    await sections.getByRole("link", { name: "Cobros" }).click();
    await expect(page).toHaveURL(/section=collections/);

    test.skip(
      (await page.getByRole("listitem").count()) === 0,
      "No pending collections available in this environment",
    );

    const trigger = page.getByRole("button", { name: "Cobrar" }).first();
    await trigger.focus();
    await expect(trigger).toBeFocused();
    await page.keyboard.press("Enter");

    const sheet = page.getByRole("dialog");
    await expect(sheet).toBeVisible();
    await expect(sheet).toBeFocused();
    await expect(sheet.getByLabel("Monto")).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(trigger).toBeFocused();
  });
});
