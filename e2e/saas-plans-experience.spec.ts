import { expect, test } from "@playwright/test";
import { startSaasPlansFixture } from "./fixtures/saas-plans-server.mjs";
import { receiptFixture } from "../src/domain/saas-administration/payment-receipt.fixture";

let fixture: Awaited<ReturnType<typeof startSaasPlansFixture>>;
test.beforeAll(async () => { fixture = await startSaasPlansFixture(); });
test.afterAll(async () => { await fixture?.close(); });
const url = "http://127.0.0.1:4179/backoffice/plans";
const collectionsUrl = "http://127.0.0.1:4179/backoffice/collections";
const issuerUrl = "http://127.0.0.1:4179/backoffice/finance/issuer";
async function seedBilling(page: import("@playwright/test").Page,ready = false,unknown = false) {
  await page.goto(collectionsUrl);
  await page.evaluate(({ core,ready,unknown }) => {
    localStorage.setItem("saas-issuer-fixture",JSON.stringify({ id: core.id,versionNumber: 1,legalName: "Plataforma Deportiva",
      taxId: "12345678-5",address: "Ñuble 123",email: "emisor@example.invalid",createdAt: core.created_at }));
    localStorage.setItem("saas-receipts-fixture",JSON.stringify([{ ...core,invoice_id: "ad480000-0000-4000-8000-000000000004",
      document: ready ? { receipt_id: core.id,storage_path: `${core.id}/v1.pdf`,sha256: "a".repeat(64),byte_size: 100,content_type: "application/pdf" } : null,
      pdf_job: { status: ready ? "succeeded" : "failed",attempts: 5,last_error: ready ? null : "SYNTHETIC_STORAGE_FAILURE" },
      deliveries: unknown ? [{ id: core.tenant_id,recipient: "billing@example.invalid",status: "unknown",requested_at: core.created_at,last_error: "SYNTHETIC_UNKNOWN" }] : [],
      billing_email: "billing@example.invalid",primary_email: "primary@example.invalid",
    }]));
  },{ core: receiptFixture,ready,unknown });
}

test("payments, receipt recovery, readiness and suspended-owner pages fit all six widths",async ({ page }) => {
  await seedBilling(page,true,true);
  for (const width of [320,375,390,768,1280,1440]) {
    await page.setViewportSize({ width,height: 900 });
    for (const route of [`${collectionsUrl}/ad480000-0000-4000-8000-000000000004`,
      `http://127.0.0.1:4179/backoffice/receipts/${receiptFixture.id}`,
      "http://127.0.0.1:4179/backoffice/finance/documents",
      "http://127.0.0.1:4179/backoffice/finance/ledger?period=2026-10&currency=CLP&metric=collected","http://127.0.0.1:4179/billing"]) {
      await page.goto(route); await expect(page.locator("main h2").first()).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
      for (const element of await page.locator('main input:not([type="hidden"]):not([type="checkbox"]),main select,main button,main a').all()) {
        if (!await element.isVisible()) continue;
        const size = await element.evaluate((el) => ({ width: (el as HTMLElement).offsetWidth,height: (el as HTMLElement).offsetHeight }));
        expect(size.width).toBeGreaterThanOrEqual(44); expect(size.height).toBeGreaterThanOrEqual(44);
      }
      const mobileNav = page.getByRole("navigation",{ name: "Navegación móvil de plataforma" });
      if (width < 1024 && await mobileNav.isVisible()) {
        const buttons = await page.locator("main button").all();
        for (const button of buttons) {
          if (!await button.isVisible()) continue;
          await button.scrollIntoViewIfNeeded();
          const bounds = await button.boundingBox(); const navBounds = await mobileNav.boundingBox();
          expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(navBounds!.y);
        }
      }
      if (route.includes("/billing")) {
        await expect(page.getByText(/Esta consulta no reactiva/)).toBeVisible();
        await expect(page.getByRole("button", { name: /Confirmar pago|Confirmar envío/ })).toHaveCount(0);
        await expect(page.getByRole("link",{ name: "Volver a la plataforma" })).toHaveCount(0);
      }
    }
  }
});
test("historical ledger retains month currency metric and all-page total on pagination",async ({ page }) => {
  await page.goto("http://127.0.0.1:4179/backoffice/finance/ledger?period=2020-01&currency=USD&metric=collected");
  await expect(page.getByText(/25 registros/)).toBeVisible();
  await page.getByRole("link",{ name: "Siguiente",exact: true }).click();
  await expect(page).toHaveURL(/period=2020-01&currency=USD&metric=collected&page=2/);
  await expect(page.getByText(/25 registros/)).toBeVisible();
  await expect(page.getByRole("link",{ name: "Revisar cobro actual" })).toHaveCount(5);
  await expect(page.getByRole("link",{ name: "Volver a indicadores" })).toHaveAttribute("href","/backoffice/finance?period=2020-01&currency=USD");
});

test("manual payment retains failed draft and payment stays confirmed across PDF and email recovery",async ({ page }) => {
  await page.setViewportSize({ width: 390,height: 844 }); await seedBilling(page);
  await page.goto(`${collectionsUrl}/ad480000-0000-4000-8000-000000000005`);
  const payment = page.getByRole("form",{ name: "Registro de pago" });
  await page.getByLabel("Referencia (obligatoria salvo efectivo)").fill("TRANSFER-234");
  await payment.getByLabel("Motivo",{ exact: true }).fill("Fallo simulado"); await payment.getByRole("checkbox").check();
  await page.getByRole("button",{ name: "Confirmar pago recibido" }).click();
  await expect(page.getByRole("alert")).toBeFocused();
  await expect(page.getByLabel("Referencia (obligatoria salvo efectivo)")).toHaveValue("TRANSFER-234");
  await payment.getByLabel("Motivo",{ exact: true }).fill("Pago validado");
  await page.getByRole("button",{ name: "Confirmar pago recibido" }).focus(); await page.keyboard.press("Enter");
  await expect(page.getByRole("status").filter({ hasText: "Pago confirmado" })).toBeVisible();
  await page.getByRole("link",{ name: "Ver comprobante y estado PDF" }).click();
  await expect(page.getByText("La generación falló. El pago permanece confirmado.")).toBeVisible();
  await page.getByRole("button",{ name: "Reintentar generación PDF" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Solicitud registrada" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("link",{ name: "Descargar PDF privado" })).toBeVisible();
  await page.getByRole("checkbox").check(); await page.getByRole("button",{ name: "Confirmar envío del PDF" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Solicitud registrada" })).toBeVisible();
  await page.reload();
  await expect(page.getByText("SYNTHETIC_MAIL_FAILURE")).toBeVisible();
  await expect(page.getByRole("heading",{ name: /Pago confirmado/ })).toBeVisible();
  await expect(page.getByRole("link",{ name: "Descargar PDF privado" })).toBeVisible();
});

test("void preserves history and uncertain mail requires explicit provider reconciliation",async ({ page }) => {
  await seedBilling(page,true,true);
  await page.goto(`${collectionsUrl}/ad480000-0000-4000-8000-000000000006`);
  await page.getByText("Anular este cobro",{ exact: true }).click();
  const form = page.getByRole("form",{ name: "Anulación de cobro" });
  await form.getByLabel("Motivo",{ exact: true }).fill("Cobro emitido por error"); await form.getByRole("checkbox").check();
  await form.getByRole("button",{ name: "Confirmar anulación" }).click();
  await expect(page.getByText("Cobro anulado. El historial se conserva.")).toBeVisible();
  await page.reload(); await expect(page.getByText("Anulado",{ exact: true })).toBeVisible();
  await page.goto(`http://127.0.0.1:4179/backoffice/receipts/${receiptFixture.id}`);
  await expect(page.getByRole("button",{ name: "Confirmar envío del PDF" })).toHaveCount(0);
  await page.getByLabel("Resultado verificado con Resend").selectOption("not_sent");
  await page.getByLabel("Evidencia o motivo de conciliación").fill("Verificado en consola de proveedor; no enviado");
  await page.getByRole("checkbox").check(); await page.getByRole("button",{ name: "Registrar conciliación" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Solicitud registrada" })).toBeVisible();
  await page.reload(); await expect(page.getByRole("button",{ name: "Confirmar envío del PDF" })).toBeVisible();
});

test("collections, detail and issuer fit six widths with usable navigation and controls", async ({ page }) => {
  for (const width of [320, 375, 390, 768, 1280, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of [collectionsUrl, `${collectionsUrl}/ad480000-0000-4000-8000-000000000001`, issuerUrl]) {
      await page.goto(route);
      await expect(page.locator("main h2").first()).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
      for (const element of await page.locator('main input:not([type="hidden"]), main select, main button, main a').all()) {
        if (!await element.isVisible()) continue;
        const size = await element.evaluate((el) => ({ width: (el as HTMLElement).offsetWidth, height: (el as HTMLElement).offsetHeight }));
        expect(size.height).toBeGreaterThanOrEqual(44);
        expect(size.width).toBeGreaterThanOrEqual(44);
      }
      for (const icon of await page.locator("main h2 svg, main button svg").all()) {
        if (!await icon.isVisible()) continue;
        const bounds = await icon.boundingBox();
        expect(bounds!.width).toBeCloseTo(16, 3);
        const parent = await icon.locator("..").boundingBox();
        expect(Math.abs(bounds!.y + bounds!.height / 2 - (parent!.y + parent!.height / 2))).toBeLessThanOrEqual(1);
      }
      if (width < 1024) {
        const nav = page.getByRole("navigation", { name: "Navegación móvil de plataforma" });
        for (const link of await nav.getByRole("link").all()) {
          const bounds = await link.boundingBox();
          expect(bounds!.width).toBeGreaterThanOrEqual(44);
        }
        if (route === collectionsUrl) await expect(nav.getByRole("link", { name: "Cobros" })).toHaveAttribute("aria-current", "page");
      }
    }
    await page.getByRole("button", { name: "Guardar nueva versión" }).scrollIntoViewIfNeeded();
    if (width < 1024) {
      const submit = await page.getByRole("button", { name: "Guardar nueva versión" }).boundingBox();
      const nav = await page.getByRole("navigation", { name: "Navegación móvil de plataforma" }).boundingBox();
      expect(submit!.y + submit!.height).toBeLessThanOrEqual(nav!.y);
    }
  }
});

test("collections preserves page and filters through detail and separates imported payments", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${collectionsUrl}?q=Central&currency=CLP`);
  await page.getByRole("link", { name: "Siguiente", exact: true }).click();
  await expect(page).toHaveURL(/page=2/);
  await page.getByRole("link", { name: "Ver detalle", exact: true }).filter({ visible: true }).first().click();
  await expect(page.getByRole("heading", { name: "Historial de pagos e intentos" })).toBeVisible();
  await page.getByRole("link", { name: "Volver a cobranza" }).click();
  await expect(page).toHaveURL(/q=Central&currency=CLP&page=2/);
  await page.goto(`${collectionsUrl}?status=paid`);
  await expect(page.getByText(/Liquidación histórica importada/).filter({ visible: true })).toBeVisible();
  await page.getByRole("link", { name: "Ver detalle", exact: true }).filter({ visible: true }).first().click();
  await expect(page.getByText(/No se inventaron transacciones/)).toBeVisible();
  await expect(page.getByText("Sin transacciones registradas.")).toBeVisible();
});

test("issuer validates RUT, retains failed draft and persists a new version after keyboard retry", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(issuerUrl);
  await page.getByLabel("Razón social del emisor").fill("Fallo simulado");
  await page.getByLabel("RUT del emisor").fill("12.345.678-5");
  await page.getByLabel("Dirección del emisor").fill("Avenida Ñuble 123");
  await page.getByLabel("Correo del emisor").fill("emisor@example.invalid");
  await page.getByLabel("Motivo del cambio").fill("Configuración inicial");
  await page.getByRole("button", { name: "Guardar nueva versión" }).click();
  await expect(page.getByRole("alert")).toBeFocused();
  await expect(page.getByLabel("Dirección del emisor")).toHaveValue("Avenida Ñuble 123");
  await page.getByLabel("Razón social del emisor").fill("Plataforma Deportiva");
  await page.getByLabel("RUT del emisor").fill("12.345.678-0");
  await page.getByRole("button", { name: "Guardar nueva versión" }).click();
  await expect(page.getByLabel("RUT del emisor")).toBeFocused();
  await expect(page.getByText(/Ingresa un RUT válido/)).toBeVisible();
  await page.getByLabel("RUT del emisor").fill("12.345.678-5");
  await page.getByRole("button", { name: "Guardar nueva versión" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("status").filter({ hasText: "Emisor guardado" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Emisor vigente · versión 1" })).toBeVisible();
  await expect(page.getByLabel("Razón social del emisor")).toHaveValue("Plataforma Deportiva");
  await expect(page.getByLabel("RUT del emisor")).toHaveValue("12345678-5");
  await expect(page.getByLabel("Dirección del emisor")).toHaveValue("Avenida Ñuble 123");
});

test("real catalog and editor fit six viewport widths with aligned icons and accessible targets", async ({ page }) => {
  for (const width of [320, 375, 390, 768, 1280, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`${url}?new=1`);
    await expect(page.getByRole("heading", { name: "Crear plan", exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    for (const element of await page.locator('main input:not([type="hidden"]):not([type="checkbox"]), main select, main button').all()) {
      if (!await element.isVisible()) continue;
      const size = await element.evaluate((el) => ({ width: (el as HTMLElement).offsetWidth, height: (el as HTMLElement).offsetHeight }));
      expect(size.height).toBeGreaterThanOrEqual(44);
      expect(size.width).toBeGreaterThanOrEqual(44);
    }
    for (const checkbox of await page.getByRole("checkbox").all()) {
      const size = await checkbox.locator("..").boundingBox();
      expect(size!.height).toBeGreaterThanOrEqual(44);
      expect(size!.width).toBeGreaterThanOrEqual(44);
    }
    for (const icon of await page.locator("main h2 svg, main button svg").all()) {
      if (!await icon.isVisible()) continue;
      const size = await icon.boundingBox();
      expect(size!.width).toBeCloseTo(16, 3);
      expect(size!.height).toBeCloseTo(16, 3);
      const parent = await icon.locator("..").boundingBox();
      expect(Math.abs(size!.y + size!.height / 2 - (parent!.y + parent!.height / 2))).toBeLessThanOrEqual(1);
    }
    await page.getByRole("button", { name: "Crear plan", exact: true }).scrollIntoViewIfNeeded();
    const submit = await page.getByRole("button", { name: "Crear plan", exact: true }).boundingBox();
    if (width < 1024) {
      const nav = page.getByRole("navigation", { name: "Navegación móvil de plataforma" });
      const bounds = await nav.boundingBox();
      expect(submit!.y + submit!.height).toBeLessThanOrEqual(bounds!.y);
      await expect(nav.getByRole("link", { name: "Planes", exact: true })).toHaveAttribute("aria-current", "page");
    }
    await page.goto(url);
    if (width >= 1024) await expect(page.getByRole("table")).toBeVisible();
    else await expect(page.getByRole("table")).toBeHidden();
  }
});

test("retains failed input, supports keyboard retry and persists a created version in synthetic storage", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${url}?new=1`);
  await page.getByLabel("Nombre del plan").fill("Fallo simulado");
  await page.getByLabel("Precio final en CLP").fill("11900");
  await page.getByLabel("Descripción (opcional)").fill("Descripción conservada");
  await page.getByLabel(/Servicios incluidos/).fill("Capacitación\nSoporte");
  await page.getByLabel("Motivo de publicación").fill("Oferta para gimnasios");
  await page.getByRole("checkbox", { name: /Tiempo real/ }).check();
  await page.getByRole("button", { name: "Crear plan", exact: true }).click();
  await expect(page.getByRole("alert")).toBeFocused();
  await expect(page.getByLabel("Descripción (opcional)")).toHaveValue("Descripción conservada");
  await expect(page.getByRole("checkbox", { name: /Tiempo real/ })).toBeChecked();
  await expect(page.getByRole("status").filter({ hasText: "Versión publicada" })).toHaveCount(0);
  await page.getByLabel("Nombre del plan").fill("Academia Nueva");
  await page.getByRole("button", { name: "Crear plan", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("status").filter({ hasText: "Versión publicada" })).toBeVisible();
  await page.goto(url);
  await expect(page.getByRole("heading", { name: "Academia Nueva", exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Academia Nueva", exact: true })).toBeVisible();
});

test("archives only after entering a reason and keeps the plan visible in archived results", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(url);
  await page.locator("summary:visible").filter({ hasText: "Archivar plan" }).click();
  await page.getByLabel("Motivo de archivo").filter({ visible: true }).fill("Oferta comercial retirada");
  await page.getByRole("button", { name: "Confirmar archivo" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Plan archivado." })).toBeVisible();
  await page.goto(`${url}?status=archived`);
  await expect(page.getByRole("heading", { name: "Academia Pro", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Publicar nueva versión" })).toHaveCount(0);
  await expect(page.locator("summary:visible").filter({ hasText: "Archivar plan" })).toHaveCount(0);
});

const assignmentUrl = "http://127.0.0.1:4179/backoffice/tenants/ad440000-0000-4000-8000-000000000011/subscription";
const versionId = "ad430000-0000-4000-8000-000000000002";

async function seedPlanChanges(page: import("@playwright/test").Page) {
  await page.goto(url);
  await page.evaluate(() => {
    const plans = [30000, 60000, 90000].map((price, i) => ({
      id: `ad460000-0000-4000-8000-00000000000${i + 1}`, slug: `plan-${i}`, status: "active",
      currentVersion: {
        id: `ad460000-0000-4000-8000-00000000001${i + 1}`, name: ["Base", "Pro", "Max"][i],
        versionNumber: 1, description: null, price, currency: "CLP", durationUnit: "days", durationCount: 30,
        trialDays: 0, maxStudents: 100, maxUsers: 5, features: ["reports"], services: ["Soporte"],
        legacy: false, createdAt: "2028-01-01T00:00:00Z",
      },
    }));
    localStorage.setItem("saas-plans-fixture", JSON.stringify(plans));
    localStorage.removeItem("saas-change-rate-fixture");
    localStorage.setItem("saas-assignment-fixture", JSON.stringify({
      tenantId: "ad440000-0000-4000-8000-000000000011", tenantName: "Academia Central",
      tenantStatus: "active", businessDate: "2028-01-21", activeStudents: 10, activeUsers: 2, scheduledChange: null,
      subscription: {
        id: "ad460000-0000-4000-8000-000000000021", planId: plans[0].id, planVersionId: plans[0].currentVersion.id,
        planName: "Base", status: "active", paymentStatus: "pending", startsOn: "2028-01-01",
        periodStartsOn: "2028-01-01", periodEndExclusive: "2028-01-31", nextBillingDate: "2028-01-31",
        price: 30000, currency: "CLP", durationUnit: "days", durationCount: 30,
      },
    }));
  });
}

test("plan change review fits six widths with exact monetary preview, touch targets and focus", async ({ page }) => {
  await seedPlanChanges(page);
  for (const width of [320, 375, 390, 768, 1280, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(assignmentUrl);
    await page.getByLabel("Nuevo plan y versión").selectOption("ad460000-0000-4000-8000-000000000012");
    await page.getByRole("button", { name: "Previsualizar cambio", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Upgrade inmediato" })).toBeFocused();
    await expect(page.getByText(/neto.*8.403.*IVA.*1.597/)).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    for (const control of await page.locator('main input:not([type="hidden"]):not([type="checkbox"]), main select, main button').all()) {
      if (!await control.isVisible()) continue;
      const bounds = await control.boundingBox();
      expect(bounds!.width).toBeGreaterThanOrEqual(44);
      expect(bounds!.height).toBeGreaterThanOrEqual(44);
    }
    for (const icon of await page.locator("main h2 svg, main button svg").all()) {
      if (!await icon.isVisible()) continue;
      const bounds = await icon.boundingBox();
      const parent = await icon.locator("..").boundingBox();
      expect(bounds!.width).toBeCloseTo(16, 3);
      expect(Math.abs(bounds!.y + bounds!.height / 2 - (parent!.y + parent!.height / 2))).toBeLessThanOrEqual(1);
    }
    const submit = page.getByRole("button", { name: "Confirmar cambio de plan" });
    await submit.scrollIntoViewIfNeeded();
    if (width < 1024) {
      const bounds = await submit.boundingBox();
      const nav = await page.getByRole("navigation", { name: "Navegación móvil de plataforma" }).boundingBox();
      expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(nav!.y);
    }
  }
});

test("successive upgrades charge only incremental difference and downgrade can be scheduled then cancelled", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await seedPlanChanges(page);
  for (const version of ["ad460000-0000-4000-8000-000000000012", "ad460000-0000-4000-8000-000000000013"]) {
    await page.goto(assignmentUrl);
    await page.getByLabel("Nuevo plan y versión").selectOption(version);
    await page.getByRole("button", { name: "Previsualizar cambio", exact: true }).click();
    await page.getByLabel("Motivo del cambio").fill("Upgrade solicitado");
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Confirmar cambio de plan" }).click();
    await expect(page.getByRole("status")).toContainText("10.000");
    await expect(page.getByRole("status")).toContainText("No se registró un pago");
  }
  await page.goto(assignmentUrl);
  await expect(page.getByText("Max", { exact: true })).toBeVisible();
  await page.getByLabel("Nuevo plan y versión").selectOption("ad460000-0000-4000-8000-000000000011");
  await page.getByRole("button", { name: "Previsualizar cambio", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Downgrade a renovación" })).toBeFocused();
  await page.getByLabel("Motivo del cambio").fill("Downgrade solicitado");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Confirmar cambio de plan" }).click();
  await expect(page.getByRole("status")).toContainText("2028-01-31");
  await page.goto(assignmentUrl);
  await expect(page.getByRole("heading", { name: "Cambio programado", exact: true })).toBeVisible();
  await expect(page.getByLabel("Nuevo plan y versión")).toHaveCount(0);
  await page.getByLabel("Motivo de cancelación").fill("El cliente mantendrá el plan");
  await page.getByRole("button", { name: "Cancelar cambio programado" }).click();
  await expect(page.getByRole("status")).toContainText("Cambio cancelado");
  await page.reload();
  await expect(page.getByRole("heading", { name: "Cambio programado", exact: true })).toHaveCount(0);
  await expect(page.getByText("Max", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Nuevo plan y versión")).toBeVisible();
});

async function seedRenewal(page: import("@playwright/test").Page) {
  await seedPlanChanges(page);
  await page.evaluate(() => {
    const management = JSON.parse(localStorage.getItem("saas-assignment-fixture")!);
    management.businessDate = "2028-01-31";
    management.subscription.price = 60000;
    management.subscription.planId = "ad460000-0000-4000-8000-000000000002";
    management.subscription.planVersionId = "ad460000-0000-4000-8000-000000000012";
    management.subscription.planName = "Pro";
    management.scheduledChange = {
      id: "ad470000-0000-4000-8000-000000000031", planName: "Base", price: 30000, currency: "CLP",
      effectiveOn: "2028-01-31", status: "scheduled", reason: "Downgrade solicitado", blockedReason: null,
    };
    localStorage.setItem("saas-assignment-fixture", JSON.stringify(management));
    localStorage.setItem("saas-renewal-target-fixture", "ad460000-0000-4000-8000-000000000011");
    localStorage.setItem("saas-renewal-anchor-fixture", "2028-01-01");
    localStorage.setItem("saas-renewal-index-fixture", "0");
    localStorage.setItem("saas-renewals-enabled-fixture", "true");
  });
}

test("renewal task and worker readiness fit six widths and never equate a manual run with scheduler readiness", async ({ page }) => {
  await seedRenewal(page);
  for (const width of [320, 375, 390, 768, 1280, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(assignmentUrl);
    await expect(page.getByRole("heading", { name: "Renovar un período vencido" })).toBeVisible();
    await expect(page.getByText(/Si cumple.*30.000.*si excede.*60.000/)).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    const button = page.getByRole("button", { name: "Renovar este período" });
    await button.scrollIntoViewIfNeeded();
    const bounds = await button.boundingBox();
    expect(bounds!.height).toBeGreaterThanOrEqual(44);
    if (width < 1024) {
      const nav = await page.getByRole("navigation", { name: "Navegación móvil de plataforma" }).boundingBox();
      expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(nav!.y);
    }
    await page.goto("http://127.0.0.1:4179/backoffice/finance/renewals");
    await expect(page.getByRole("heading", { name: "Procesador de renovaciones" })).toBeVisible();
    await expect(page.getByRole("alert")).toContainText("No hay actividad reciente");
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  }
});

test("renewal revalidates a downgrade, preserves the old plan when blocked and shows the durable administrative notice", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await seedRenewal(page);
  await page.evaluate(() => {
    const plans = JSON.parse(localStorage.getItem("saas-plans-fixture")!);
    plans[0].currentVersion.maxStudents = 5;
    localStorage.setItem("saas-plans-fixture", JSON.stringify(plans));
  });
  await page.goto(assignmentUrl);
  await page.getByRole("checkbox", { name: /Revisé el contrato/ }).check();
  await page.getByRole("button", { name: "Renovar este período" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("status")).toContainText("60.000");
  await expect(page.getByRole("status")).toContainText("No se registró un pago");
  await expect(page.getByRole("alert")).toContainText("Se renovó el plan anterior");
  await page.goto(assignmentUrl);
  await expect(page.getByRole("heading", { name: "Cambio bloqueado", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Renovar este período" })).toHaveCount(0);
  await page.goto("http://127.0.0.1:4179/backoffice/finance/renewals");
  await expect(page.getByRole("region", { name: "Avisos de cambios bloqueados" })).toContainText("Academia Central");
  await expect(page.getByRole("alert")).toContainText("No hay actividad reciente");
});

test("valid downgrade renews the next period at its contracted price without keeping a pending change", async ({ page }) => {
  await seedRenewal(page);
  await page.goto(assignmentUrl);
  await page.getByRole("checkbox", { name: /Revisé el contrato/ }).check();
  await page.getByRole("button", { name: "Renovar este período" }).click();
  await expect(page.getByRole("status")).toContainText("30.000");
  await expect(page.getByRole("status")).toContainText("2028-03-01");
  await page.goto(assignmentUrl);
  await expect(page.getByText("Base", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Cambio programado", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Renovar este período" })).toHaveCount(0);
});

test("assignment preview fits six widths and keeps its confirmation clear of mobile navigation", async ({ page }) => {
  for (const width of [320, 375, 390, 768, 1280, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(assignmentUrl);
    await page.getByLabel("Plan y versión").selectOption(versionId);
    await page.getByRole("button", { name: "Previsualizar asignación" }).click();
    await expect(page.getByRole("heading", { name: "Revisar asignación" })).toBeFocused();
    await expect(page.getByText(/neto.*10.000.*IVA.*1.900/)).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    for (const control of await page.locator('main input:not([type="hidden"]):not([type="checkbox"]), main select, main button').all()) {
      if (!await control.isVisible()) continue;
      const dimensions = await control.evaluate((el) => ({ width: (el as HTMLElement).offsetWidth, height: (el as HTMLElement).offsetHeight }));
      expect(dimensions.width).toBeGreaterThanOrEqual(44);
      expect(dimensions.height).toBeGreaterThanOrEqual(44);
    }
    const submit = page.getByRole("button", { name: "Confirmar asignación" });
    await submit.scrollIntoViewIfNeeded();
    if (width < 1024) {
      const bounds = await submit.boundingBox();
      const nav = await page.getByRole("navigation", { name: "Navegación móvil de plataforma" }).boundingBox();
      expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(nav!.y);
    }
  }
});

test("assignment rejects obsolete preview, retains draft, retries and reloads a persisted synthetic contract", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(assignmentUrl);
  await page.getByLabel("Plan y versión").selectOption(versionId);
  await page.getByRole("button", { name: "Previsualizar asignación" }).click();
  await page.getByLabel("Motivo de asignación").fill("Conflicto simulado");
  await page.getByRole("checkbox", { name: /Revisé el plan/ }).check();
  await page.getByRole("button", { name: "Confirmar asignación" }).click();
  await expect(page.getByRole("alert")).toBeFocused();
  await expect(page.getByLabel("Plan y versión")).toHaveValue(versionId);
  await expect(page.getByRole("button", { name: "Confirmar asignación" })).toHaveCount(0);
  await page.getByRole("button", { name: "Previsualizar asignación" }).click();
  await page.getByLabel("Motivo de asignación").fill("Contrato inicial");
  await page.getByRole("checkbox", { name: /Revisé el plan/ }).check();
  await page.getByRole("button", { name: "Confirmar asignación" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("status")).toContainText("No se registró ningún pago");
  await page.reload();
  await expect(page.getByText("Academia Pro", { exact: true })).toBeVisible();
  await expect(page.getByText("Pendiente", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Previsualizar asignación" })).toHaveCount(0);
});

test("optional trial previews no initial debt and records no fictitious receipt", async ({ page }) => {
  await page.goto(assignmentUrl);
  await page.getByLabel("Plan y versión").selectOption(versionId);
  await page.getByRole("checkbox", { name: /Usar 7 días de prueba/ }).check();
  await page.getByRole("button", { name: "Previsualizar asignación" }).click();
  await expect(page.getByText("No se emitirá cobro inicial, pago ni comprobante.", { exact: false })).toBeVisible();
  await expect(page.getByText("2028-02-07", { exact: true })).toBeVisible();
  await page.getByLabel("Motivo de asignación").fill("Prueba de contratación");
  await page.getByRole("checkbox", { name: /Revisé el plan/ }).check();
  await page.getByRole("button", { name: "Confirmar asignación" }).click();
  await expect(page.getByRole("status")).toContainText("No se registró ningún pago ni comprobante");
});
