"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button } from "@/presentation/components/primitives";
import {
  confirmPasswordAction,
  type ConfirmPasswordFormState,
} from "./actions";

const initialState: ConfirmPasswordFormState = {
  error: null,
  success: false,
};

export function ConfirmPasswordForm() {
  const [state, formAction, pending] = useActionState(
    confirmPasswordAction,
    initialState,
  );

  if (state.success) {
    return (
      <div className="flex flex-col gap-4">
        <p role="status">Tu contraseña fue actualizada.</p>
        <Link className="text-primary underline" href="/dashboard">
          Continuar al panel
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1">
        Nueva contraseña
        <input
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className="rounded-lg border border-input bg-background px-3 py-2"
        />
      </label>
      <label className="flex flex-col gap-1">
        Confirmar contraseña
        <input
          name="passwordConfirmation"
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
      <Button
        type="submit"
        variant="primary"
        isLoading={pending}
        className="py-2"
      >
        {pending ? "Actualizando…" : "Actualizar contraseña"}
      </Button>
    </form>
  );
}
