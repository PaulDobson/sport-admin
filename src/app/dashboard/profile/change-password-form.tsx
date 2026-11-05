"use client";

import { useActionState, useEffect, useRef } from "react";
import { Button, FieldControl } from "@/presentation/components/primitives";
import {
  changePasswordAction,
  type ChangePasswordFormState,
} from "./actions";

const initialState: ChangePasswordFormState = {
  error: null,
  success: false,
};

interface ChangePasswordFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function ChangePasswordForm({
  onSuccess,
  onCancel,
}: ChangePasswordFormProps) {
  const [state, formAction, pending] = useActionState(
    changePasswordAction,
    initialState,
  );

  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) {
      formRef.current?.reset();
      onSuccess?.();
    }
  }, [state.success, onSuccess]);

  if (state.success) {
    return (
      <div className="mt-4 rounded-lg border border-border bg-success/10 p-3">
        <p
          role="status"
          className="text-sm font-medium text-success"
        >
          Contraseña actualizada correctamente.
        </p>
      </div>
    );
  }

  return (
    <form
      ref={formRef}
      action={formAction}
      className="mt-4 flex flex-col gap-3"
      noValidate
    >
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-foreground">Nueva contraseña</span>
        <FieldControl
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          placeholder="Mínimo 8 caracteres"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-foreground">
          Confirmar contraseña
        </span>
        <FieldControl
          name="passwordConfirmation"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          placeholder="Repite la nueva contraseña"
        />
      </label>

      {state.error ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}

      <div className="flex gap-2 pt-1">
        <Button
          type="submit"
          variant="primary"
          isLoading={pending}
          className="flex-1"
        >
          {pending ? "Guardando…" : "Guardar contraseña"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={pending}
          onClick={onCancel}
        >
          Cancelar
        </Button>
      </div>
    </form>
  );
}
