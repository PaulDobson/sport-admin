import { expect, test } from "@playwright/test";

test("keeps the public access surface keyboard reachable without overflow", async ({
  page,
}, testInfo) => {
  await page.goto("/log-in");
  if (!testInfo.project.name.includes("mobile")) {
    await page.getByLabel("Correo electronico").click();
    await expect
      .poll(() =>
        page.evaluate(() => document.activeElement?.getAttribute("name")),
      )
      .toBe("email");
    await page.keyboard.press("Tab");
    await expect
      .poll(() =>
        page.evaluate(() => document.activeElement?.getAttribute("name")),
      )
      .toBe("password");
  }

  const dimensions = await page.evaluate(() => ({
    viewportWidth: document.documentElement.clientWidth,
    contentWidth: document.documentElement.scrollWidth,
  }));
  expect(dimensions.contentWidth).toBeLessThanOrEqual(dimensions.viewportWidth);
});
