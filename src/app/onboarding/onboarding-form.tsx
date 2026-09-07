"use client";

import { useActionState } from "react";
import { Button } from "@/presentation/components/primitives";
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
      <Button
        type="submit"
        variant="primary"
        isLoading={pending}
        className="py-2"
      >
        {pending ? "Creando…" : "Comenzar"}
      </Button>
    </form>
  );
}
