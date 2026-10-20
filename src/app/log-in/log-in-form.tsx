"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { AlertCircle, ArrowRight, Eye, EyeOff } from "lucide-react";
import { logInAction, type LogInFormState } from "./actions";
import { Button } from "@/presentation/components/primitives";

const initialState: LogInFormState = { error: null };
const inputClass =
  "mt-2 h-12 w-full rounded-lg border border-input bg-[#0c1215] px-4 text-sm text-foreground outline-none transition placeholder:text-muted-foreground/70 focus:border-primary focus:ring-2 focus:ring-primary/20";

export function LogInForm({
  initialError = null,
  next,
}: {
  initialError?: string | null;
  next?: string;
}) {
  const [state, formAction, pending] = useActionState(logInAction, {
    ...initialState,
    error: initialError,
  });
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {next?.startsWith("/portal/accept?token=") ? (
        <input type="hidden" name="next" value={next} />
      ) : null}
      <label
        htmlFor="login-email"
        className="text-sm font-semibold text-foreground"
      >
        Correo electronico
        <input
          id="login-email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="tu@academia.cl"
          className={inputClass}
        />
      </label>
      <div className="text-sm font-semibold text-foreground">
        <span className="flex items-center justify-between gap-3">
          <label htmlFor="login-password">Contraseña</label>
          <Link
            href="/reset-password"
            className="text-xs font-semibold text-primary transition-colors hover:text-primary/80"
          >
            ¿Olvidaste tu clave?
          </Link>
        </span>
        <div className="relative">
          <input
            id="login-password"
            name="password"
            type={showPassword ? "text" : "password"}
            required
            minLength={6}
            autoComplete="current-password"
            placeholder="Ingresa tu contraseña"
            className={`${inputClass} pr-12`}
          />
          <button
            type="button"
            onClick={() => setShowPassword((visible) => !visible)}
            aria-label={
              showPassword ? "Ocultar contraseña" : "Mostrar contraseña"
            }
            title={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
            className="absolute inset-y-2 right-1 mt-2 flex w-10 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-surface-raised hover:text-foreground"
          >
            {showPassword ? (
              <EyeOff aria-hidden="true" className="h-4 w-4" />
            ) : (
              <Eye aria-hidden="true" className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>
      {state.error ? (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
        >
          <AlertCircle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
          {state.error}
        </p>
      ) : null}
      <Button
        type="submit"
        variant="primary"
        isLoading={pending}
        className="mt-1 min-h-12 w-full px-5 text-sm"
      >
        {pending ? "Ingresando…" : "Ingresar a mi cuenta"}
        {!pending ? (
          <ArrowRight aria-hidden="true" className="h-4 w-4" />
        ) : null}
      </Button>
    </form>
  );
}
