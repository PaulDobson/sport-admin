import { createRoot } from "react-dom/client";
import GymPage from "../../src/app/dashboard/gym/page";
import { AppShell, ProductMark } from "../../src/presentation/components/app-shell";
import { DesktopNavigation, MobileNavigation } from "../../src/presentation/components/primary-navigation";
import { OperationalRouteTopbar } from "../../src/presentation/components/operational-route-topbar";
import "../../src/presentation/styles/globals.css";
import "@fontsource-variable/manrope";

async function renderFixture() {
  const page = await GymPage();
  createRoot(document.getElementById("root")!).render(
    <AppShell
      sidebarHeader={<ProductMark context="Dueño" />}
      navigation={<DesktopNavigation role="owner" />}
      mobileNavigation={<MobileNavigation role="owner" quickAction={<button type="button" className="min-h-11 px-3">Crear</button>} />}
      topbar={<OperationalRouteTopbar tenantName="Academia Central" account={{ profileName: "Ana Silva", currentTenantId: "tenant-fixture", tenants: [{ id: "tenant-fixture", name: "Academia Central" }], roleLabel: "Dueño", canManageGym: true }} />}
    >{page}</AppShell>,
  );
}
void renderFixture();
