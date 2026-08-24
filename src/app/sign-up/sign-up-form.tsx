"use client";

import { useActionState } from "react";
import { signUpAction, type SignUpFormState } from "./actions";

const initialState: SignUpFormState = { error: null, success: false };

export function SignUpForm() {
  const [state, formAction, pending] = useActionState(
    signUpAction,
    initialState,
  );

  if (state.success) {
    return (
      <p role="status">
        Revisa tu correo para confirmar tu cuenta antes de continuar.
      </p>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1">
        Nombre completo
        <input
          name="fullName"
          required
          autoComplete="name"
          className="rounded-lg border border-input bg-background px-3 py-2"
        />
      </label>
      <label className="flex flex-col gap-1">
        Correo electronico
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          className="rounded-lg border border-input bg-background px-3 py-2"
        />
      </label>
      <label className="flex flex-col gap-1">
        Contraseña
        <input
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className="rounded-lg border border-input bg-background px-3 py-2"
        />
      </label>
      {state.error ? (
        <p role="alert" className="text-destructive">
          {state.error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-primary px-4 py-2 text-primary-foreground disabled:opacity-60"
      >
        {pending ? "Creando cuenta…" : "Crear cuenta"}
      </button>
    </form>
  );
}
