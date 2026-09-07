"use client";

import { useActionState } from "react";
import { updateProfileAction, type ProfileFormState } from "./actions";

const initialState: ProfileFormState = { error: null, saved: false };

export function ProfileForm({
  fullName,
  avatarUrl,
}: {
  fullName: string;
  avatarUrl: string | null;
}) {
  const [state, formAction, pending] = useActionState(
    updateProfileAction,
    initialState,
  );

  return (
    <form action={formAction} className="grid gap-5">
      <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        Nombre completo
        <input
          name="fullName"
          required
          minLength={2}
          maxLength={120}
          defaultValue={fullName}
          className="h-11 rounded-xl border border-input bg-background/50 px-3 text-sm font-normal tracking-normal text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </label>
      <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        URL del avatar
        <input
          name="avatarUrl"
          type="url"
          placeholder="https://..."
          defaultValue={avatarUrl ?? ""}
          className="h-11 rounded-xl border border-input bg-background/50 px-3 text-sm font-normal tracking-normal text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </label>
      {state.error ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}
      {state.saved ? (
        <p role="status" className="text-sm text-success">
          Perfil actualizado.
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="min-h-11 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-60"
      >
        {pending ? "Guardando..." : "Guardar cambios"}
      </button>
    </form>
  );
}
