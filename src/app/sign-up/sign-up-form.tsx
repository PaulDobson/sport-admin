"use client";

import { useActionState, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
} from "lucide-react";
import { Button } from "@/presentation/components/primitives";
import { signUpAction, type SignUpFormState } from "./actions";

const initialState: SignUpFormState = { error: null, success: false };
const inputClass =
  "mt-2 h-12 w-full rounded-lg border border-input bg-[#0c1215] px-4 text-sm text-foreground outline-none transition placeholder:text-muted-foreground/70 focus:border-primary focus:ring-2 focus:ring-primary/20";

export function SignUpForm() {
  const [state, formAction, pending] = useActionState(
    signUpAction,
    initialState,
  );
  const [showPassword, setShowPassword] = useState(false);

  if (state.success) {
    return (
      <div
        role="status"
        className="rounded-lg border border-success/30 bg-success/10 p-5"
      >
        <CheckCircle2 aria-hidden="true" className="h-7 w-7 text-success" />
        <p className="mt-3 font-bold text-foreground">Cuenta creada</p>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          Revisa tu correo para confirmar tu cuenta antes de continuar.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <label
        htmlFor="signup-name"
        className="text-sm font-semibold text-foreground"
      >
        Nombre completo
        <input
          id="signup-name"
          name="fullName"
          required
          autoComplete="name"
          placeholder="Tu nombre y apellido"
          className={inputClass}
        />
      </label>
      <label
        htmlFor="signup-email"
        className="text-sm font-semibold text-foreground"
      >
        Correo electronico
        <input
          id="signup-email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="tu@academia.cl"
          className={inputClass}
        />
      </label>
      <div className="text-sm font-semibold text-foreground">
        <label htmlFor="signup-password">Contraseña</label>
        <div className="relative">
          <input
            id="signup-password"
            name="password"
            type={showPassword ? "text" : "password"}
            required
            minLength={8}
            autoComplete="new-password"
            placeholder="Mínimo 8 caracteres"
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
        {pending ? "Creando cuenta…" : "Crear mi espacio deportivo"}
        {!pending ? (
          <ArrowRight aria-hidden="true" className="h-4 w-4" />
        ) : null}
      </Button>
      <p className="text-center text-xs leading-5 text-muted-foreground">
        Al continuar, confirmas que usarás Sport Admin para gestionar tu
        organización deportiva de forma responsable.
      </p>
    </form>
  );
}
