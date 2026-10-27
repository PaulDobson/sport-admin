import { DomainError, ValidationError } from "@/domain/shared/errors";

/** Maps a thrown error to a safe, user-facing message for Server Action state. */
export function formatActionError(error: unknown): string {
  if (error instanceof ValidationError) {
    return error.issues.map((issue) => issue.message).join(" ");
  }
  if (error instanceof DomainError) {
    return error.message;
  }

  // Surface well-known Supabase Auth error codes with actionable messages.
  if (isAuthError(error)) {
    return formatAuthError(error.code, error.message);
  }

  console.error("Unexpected action error", error);
  return "Something went wrong. Please try again.";
}

// ---------------------------------------------------------------------------
// Supabase Auth error helpers
// ---------------------------------------------------------------------------

interface SupabaseAuthError {
  __isAuthError: true;
  code?: string;
  status?: number;
  message: string;
}

function isAuthError(error: unknown): error is SupabaseAuthError {
  return (
    typeof error === "object" &&
    error !== null &&
    "__isAuthError" in error &&
    (error as SupabaseAuthError).__isAuthError === true
  );
}

function formatAuthError(code: string | undefined, fallback: string): string {
  switch (code) {
    case "email_address_invalid":
      return "El correo electrónico no es válido o no está permitido. Verifica la dirección e intenta de nuevo.";
    case "email_address_not_authorized":
      return "Este correo electrónico no está autorizado. Usa el correo con el que recibiste la invitación.";
    case "user_already_exists":
    case "email_exists":
      return "Ya existe una cuenta con este correo. Inicia sesión en lugar de registrarte.";
    case "weak_password":
      return "La contraseña es muy débil. Usa al menos 8 caracteres con letras y números.";
    case "invalid_credentials":
      return "Correo o contraseña incorrectos.";
    case "email_not_confirmed":
      return "Confirma tu correo electrónico antes de iniciar sesión. Revisa tu bandeja de entrada.";
    case "over_email_send_rate_limit":
    case "over_request_rate_limit":
      return "Demasiados intentos. Espera unos minutos antes de volver a intentarlo.";
    case "session_expired":
    case "refresh_token_not_found":
      return "Tu sesión expiró. Por favor inicia sesión nuevamente.";
    default:
      console.error("Unhandled Supabase auth error", {
        code,
        message: fallback,
      });
      return "Error de autenticación. Por favor intenta de nuevo.";
  }
}
