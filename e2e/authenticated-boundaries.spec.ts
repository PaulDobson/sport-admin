import { expect, test } from "@playwright/test";

test("protects authenticated shell routes without leaking tenant context", async ({
  page,
}) => {
  for (const path of [
    "/dashboard",
    "/dashboard/profile",
    "/dashboard/schedule",
    "/backoffice/tenants",
  ]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/log-in(?:\?.*)?$/);
    await expect(
      page.getByText(/Box Norte|Backoffice|Panel operativo/),
    ).toHaveCount(0);
  }
});
