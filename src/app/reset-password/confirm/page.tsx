import { redirect } from "next/navigation";
import { createAuthDeps } from "@/infrastructure/composition/auth-composition";
import { ConfirmPasswordForm } from "./confirm-password-form";

export default async function ConfirmPasswordPage() {
  const deps = await createAuthDeps();
  const userId = await deps.auth.getCurrentUserId();
  if (!userId) redirect("/reset-password");

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-4">
      <h1 className="text-2xl font-semibold">Crear nueva contraseña</h1>
      <ConfirmPasswordForm />
    </main>
  );
}
