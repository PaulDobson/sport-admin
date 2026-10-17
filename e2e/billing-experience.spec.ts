import { expect, test, type Page } from "@playwright/test";

const email = process.env.E2E_EMAIL;
const password = process.env.E2E_PASSWORD;
const studentQuery = process.env.E2E_STUDENT_QUERY ?? "a";
const hasCredentials = Boolean(email && password);

async function signIn(page: Page) {
  await page.goto("/log-in");
  await page.getByLabel("Correo electronico").fill(email ?? "");
  await page.getByLabel("Contraseña").fill(password ?? "");
  await page.getByRole("button", { name: "Ingresar" }).click();
  await expect(page).toHaveURL(/\/dashboard(?:\?.*)?$/);
}

const viewports = [
  { name: "mobile", width: 375, height: 812 },
  { name: "desktop", width: 1280, height: 900 },
] as const;

for (const viewport of viewports) {
  test.describe(`billing experience (${viewport.name})`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });
    test.skip(
      !hasCredentials,
      "Set E2E_EMAIL and E2E_PASSWORD for authenticated coverage",
    );

    test("creates a plan from a template, assigns it with a partial payment and sees the balance everywhere", async ({
      page,
    }) => {
      const planName = `E2E Trimestral ${viewport.name} ${Date.now()}`;
      await signIn(page);

      await page.goto("/dashboard/finance?section=plans");
      await page.getByRole("button", { name: "Nuevo plan" }).click();
      const planSheet = page.getByRole("dialog", { name: "Nuevo plan" });
      await planSheet.getByRole("button", { name: /^Trimestral/ }).click();
      await planSheet.getByLabel("Nombre").fill(planName);
      await planSheet.getByLabel("Precio").fill("90000");
      await planSheet.getByRole("button", { name: "Crear plan" }).click();
      await expect(planSheet.getByText("Plan creado.")).toBeVisible();
      await planSheet.getByRole("button", { name: "Cerrar" }).click();
      await expect(page.getByText(planName)).toBeVisible();

      await page.getByRole("button", { name: "Acción rápida" }).click();
      await page.getByRole("menuitem", { name: "Asignar plan" }).click();
      await expect(page).toHaveURL(/assign=1/);
      const assign = page.getByRole("dialog", { name: "Asignar plan" });
      await assign.getByLabel("Buscar alumno").fill(studentQuery);
      const students = assign.getByRole("list", { name: "Alumnos" });
      const eligible = students.getByRole("button");
      await expect(students).toBeVisible();
      test.skip(
        (await eligible.count()) === 0,
        "No student without a current membership in this environment",
      );
      const studentName = ((await eligible.first().innerText()) ?? "")
        .split("\n")[0]
        .trim();
      await eligible.first().click();

      await assign.getByRole("button", { name: new RegExp(planName) }).click();
      await expect(
        assign.getByRole("heading", { name: "Revisa y confirma" }),
      ).toBeVisible();
      await assign.getByLabel("Monto pagado").fill("30000");
      await assign
        .getByRole("button", { name: "Asignar y registrar pago" })
        .click();
      await expect(assign.getByText("Plan asignado")).toBeVisible();
      await expect(assign.getByText("Saldo pendiente")).toBeVisible();
      await assign.getByRole("button", { name: "Listo" }).click();
      await expect(page).not.toHaveURL(/assign=1/);

      await page.goto("/dashboard/finance?section=collections");
      await expect(
        page.getByRole("listitem").filter({ hasText: studentName }).first(),
      ).toBeVisible();

      await page.goto("/dashboard/finance");
      await expect(
        page.getByRole("heading", { name: "Cobrado del mes" }),
      ).toBeVisible();
      await expect(
        page
          .getByRole("region", { name: "Movimientos recientes" })
          .getByText(studentName)
          .first(),
      ).toBeVisible();
      await expect(
        page
          .getByRole("region", { name: "Rendimiento por plan" })
          .getByText(planName),
      ).toBeVisible();

      await page.goto("/dashboard");
      const finance = page.getByRole("region", { name: "Finanzas del mes" });
      await expect(finance).toBeVisible();
      await finance.getByRole("link", { name: "Ver finanzas" }).click();
      await expect(page).toHaveURL(/\/dashboard\/finance$/);
    });

    test("lays out the summary for the viewport", async ({ page }) => {
      await signIn(page);
      await page.goto("/dashboard/finance");

      const cards = page
        .getByRole("region", { name: /Indicadores de/ })
        .getByRole("link");
      await expect(cards).toHaveCount(4);
      const first = await cards.nth(0).boundingBox();
      const third = await cards.nth(2).boundingBox();
      expect(first && third).toBeTruthy();
      if (viewport.width < 1024) {
        expect(third!.y).toBeGreaterThan(first!.y);
      } else {
        expect(third!.y).toBeCloseTo(first!.y, 0);
      }
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);
    });
  });
}
