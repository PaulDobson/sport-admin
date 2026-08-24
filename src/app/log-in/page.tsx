import Link from "next/link";
import { LogInForm } from "./log-in-form";

interface LogInPageProps {
  searchParams: Promise<{ error?: string }>;
}

export default async function LogInPage({ searchParams }: LogInPageProps) {
  const { error } = await searchParams;
  const initialError =
    error === "auth_callback_failed"
      ? "El enlace de autenticacion es invalido o ha expirado. Solicita uno nuevo."
      : null;

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-4">
      <h1 className="text-2xl font-semibold">Ingresar</h1>
      <LogInForm initialError={initialError} />
      <Link
        href="/reset-password"
        className="text-sm text-muted-foreground underline"
      >
        Olvide mi contraseña
      </Link>
    </main>
  );
}
