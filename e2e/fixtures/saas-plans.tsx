import { createRoot } from "react-dom/client";
import SaasPlansPage from "../../src/app/backoffice/plans/page";
import PlanVersionHistoryPage from "../../src/app/backoffice/plans/[planId]/page";
import "../../src/presentation/styles/globals.css";
import "@fontsource-variable/manrope";

async function renderFixture() {
  const params = Object.fromEntries(new URLSearchParams(window.location.search));
  const planId = window.location.pathname.split("/")[3];
  const page = await (planId ? PlanVersionHistoryPage({
    params: Promise.resolve({ planId }), searchParams: Promise.resolve(params),
  }) : SaasPlansPage({ searchParams: Promise.resolve(params) }));
  createRoot(document.getElementById("root")!).render(page);
}
void renderFixture();
