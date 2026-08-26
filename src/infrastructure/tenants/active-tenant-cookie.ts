import { cookies } from "next/headers";

const ACTIVE_TENANT_COOKIE = "sport-admin-active-tenant";

export async function readActiveTenantCookie(): Promise<string | null> {
  return (await cookies()).get(ACTIVE_TENANT_COOKIE)?.value ?? null;
}

export async function writeActiveTenantCookie(tenantId: string): Promise<void> {
  (await cookies()).set(ACTIVE_TENANT_COOKIE, tenantId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}

export async function clearActiveTenantCookie(): Promise<void> {
  (await cookies()).delete(ACTIVE_TENANT_COOKIE);
}
