import { AuthShell } from "@/presentation/components/auth-shell";
import { LogInForm } from "./log-in-form";

interface LogInPageProps {
  searchParams: Promise<{ error?: string; next?: string }>;
}

export default async function LogInPage({ searchParams }: LogInPageProps) {
  const { error, next } = await searchParams;
  const initialError =
    error === "auth_callback_failed"
      ? "El enlace de autenticacion es invalido o ha expirado. Solicita uno nuevo."
      : null;

  return (
    <AuthShell
      eyebrow="Bienvenido de vuelta"
      title="Tu equipo ya está en movimiento"
      description="Ingresa para coordinar clases, registrar asistencia y mantener al día la gestión de tu organización deportiva."
      alternatePrompt="¿Aún no tienes una cuenta?"
      alternateLabel="Comienza ahora"
      alternateHref="/sign-up"
    >
      <LogInForm initialError={initialError} next={next} />
    </AuthShell>
  );
}
