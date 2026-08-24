"use client";

import { useActionState } from "react";
import { logInAction, type LogInFormState } from "./actions";

const initialState: LogInFormState = { error: null };

export function LogInForm({
  initialError = null,
}: {
  initialError?: string | null;
}) {
  const [state, formAction, pending] = useActionState(logInAction, {
    ...initialState,
    error: initialError,
  });

  return (
    <form action={formAction} className="flex flex-col gap-4">
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
          autoComplete="current-password"
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
        {pending ? "Ingresando…" : "Ingresar"}
      </button>
    </form>
  );
}
