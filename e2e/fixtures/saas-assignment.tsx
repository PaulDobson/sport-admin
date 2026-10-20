import { createRoot } from "react-dom/client";
import TenantSubscriptionPage from "../../src/app/backoffice/tenants/[tenantId]/subscription/page";
import "../../src/presentation/styles/globals.css";
import "@fontsource-variable/manrope";

async function renderFixture() {
  const page = await TenantSubscriptionPage({
    params: Promise.resolve({ tenantId: "ad440000-0000-4000-8000-000000000011" }),
  });
  createRoot(document.getElementById("root")!).render(page);
}
void renderFixture();
