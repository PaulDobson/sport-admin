"use client";

import { useActionState } from "react";
import { AlertCircle, ArrowRight } from "lucide-react";
import { Button } from "@/presentation/components/primitives";
import { registerPortalAccountAction } from "../actions";

const inputClass =
  "mt-2 h-12 w-full rounded-lg border border-input bg-background px-4 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20";
const initialState = { error: null, success: false };

export function PortalRegistrationForm({
  token,
  email,
}: {
  token: string;
  email: string;
}) {
  const [state, formAction, pending] = useActionState(
    registerPortalAccountAction,
    initialState,
  );

  if (state.success) {
    return (
      <div role="status" className="rounded-lg bg-success/10 p-4 text-sm">
        Revisa {email} y confirma tu correo. Después podrás ingresar y reservar
        sesiones.
      </div>
    );
  }

  return (
    <form action={formAction} className="grid gap-4">
      <input type="hidden" name="token" value={token} />
      <label className="text-sm font-semibold">
        Correo invitado
        <input
          name="email"
          type="email"
          required
          readOnly
          value={email}
          className={`${inputClass} opacity-75`}
        />
      </label>
      <label className="text-sm font-semibold">
        Nombre de alumno o apoderado
        <input
          name="fullName"
          autoComplete="name"
          required
          minLength={2}
          className={inputClass}
        />
      </label>
      <label className="text-sm font-semibold">
        Crea una contraseña
        <input
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          className={inputClass}
        />
        <span className="mt-1 block text-xs font-normal text-muted-foreground">
          Usa al menos 8 caracteres.
        </span>
      </label>
      {state.error ? (
        <p role="alert" className="flex gap-2 text-sm text-destructive">
          <AlertCircle aria-hidden="true" className="h-4 w-4 shrink-0" />
          {state.error}
        </p>
      ) : null}
      <Button
        type="submit"
        variant="primary"
        isLoading={pending}
        className="min-h-12 w-full"
      >
        {pending ? "Creando cuenta…" : "Crear acceso"}
        {!pending ? (
          <ArrowRight aria-hidden="true" className="h-4 w-4" />
        ) : null}
      </Button>
    </form>
  );
}
