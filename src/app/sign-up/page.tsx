import { AuthShell } from "@/presentation/components/auth-shell";
import { SignUpForm } from "./sign-up-form";

export default function SignUpPage() {
  return (
    <AuthShell
      eyebrow="Da el siguiente paso"
      title="Haz crecer tu comunidad deportiva"
      description="Crea tu espacio de trabajo y empieza a organizar alumnos, clases, asistencia y cobros desde una sola plataforma."
      alternatePrompt="¿Ya tienes una cuenta?"
      alternateLabel="Ingresa aquí"
      alternateHref="/log-in"
    >
      <SignUpForm />
    </AuthShell>
  );
}
