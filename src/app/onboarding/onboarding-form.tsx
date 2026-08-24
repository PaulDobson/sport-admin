"use client";

import { useActionState } from "react";
import { completeOnboardingAction, type OnboardingFormState } from "./actions";

const initialState: OnboardingFormState = { error: null };

export function OnboardingForm() {
  const [state, formAction, pending] = useActionState(
    completeOnboardingAction,
    initialState,
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1">
        Nombre de tu negocio o academia
        <input
          name="tenantName"
          required
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
        {pending ? "Creando…" : "Comenzar"}
      </button>
    </form>
  );
}
