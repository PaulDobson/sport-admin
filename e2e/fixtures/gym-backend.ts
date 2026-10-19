import type { TenantDetails } from "../../src/domain/tenants/tenant-details";
import type { GymFormState } from "../../src/app/dashboard/gym/actions";

const initial: TenantDetails = {
  tenantId: "tenant-fixture", name: "Academia Central", address: null,
  contactName: null, contactEmail: null, phone: null, city: null, region: null,
};
const load = (): TenantDetails => JSON.parse(localStorage.getItem("gym-fixture") ?? JSON.stringify(initial));
export const usePathname = () => "/dashboard/gym";
export const requireOperationalMembership = async () => ({ tenantId: initial.tenantId, role: "owner", status: "active" });
export const createTenantDetailsDeps = async () => ({ findByTenantId: async () => load() });
export function redirect(path: string): never { throw new Error(`Unexpected redirect to ${path}`); }
export async function selectTenantAction() {}
export async function signOutAction() {}

export async function updateGymAction(_previous: GymFormState, form: FormData): Promise<GymFormState> {
  await new Promise(resolve => setTimeout(resolve, 200));
  if (form.get("contactEmail") === "fail@example.cl") return { saved: false, error: "No pudimos guardar los datos del gimnasio. Tus cambios siguen aquí; vuelve a intentarlo." };
  const text = (key: string) => String(form.get(key) ?? "").trim() || null;
  const details: TenantDetails = {
    tenantId: initial.tenantId, name: text("name") ?? "", address: text("address"),
    contactName: text("contactName"), contactEmail: text("contactEmail"),
    phone: text("phone"), city: text("city"), region: text("region"),
  };
  localStorage.setItem("gym-fixture", JSON.stringify(details));
  return { error: null, saved: true, details };
}
