"use server";

import { redirect } from "next/navigation";
import { createAuthDeps } from "@/infrastructure/composition/auth-composition";
import { clearActiveTenantCookie } from "@/infrastructure/composition/tenant-context-composition";

export async function signOutAction() {
  const auth = await createAuthDeps();
  await auth.auth.signOut();
  await clearActiveTenantCookie();
  redirect("/log-in");
}
