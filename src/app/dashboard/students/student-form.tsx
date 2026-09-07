"use client";

import { useActionState } from "react";
import { createStudentAction, type StudentFormState } from "./actions";

const initialState: StudentFormState = { error: null, saved: false };

export function StudentForm() {
  const [state, formAction, pending] = useActionState(
    createStudentAction,
    initialState,
  );

  return (
    <form
      action={formAction}
      className="grid gap-4 rounded-xl border border-border bg-card p-4 shadow-lg shadow-black/10 sm:grid-cols-2"
    >
      <label className="flex flex-col gap-1 text-sm text-muted-foreground">
        Nombre completo
        <input
          name="fullName"
          required
          className="h-10 rounded-lg border border-input bg-background px-3 text-foreground"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm text-muted-foreground">
        Fecha de nacimiento
        <input
          name="birthDate"
          type="date"
          className="h-10 rounded-lg border border-input bg-background px-3 text-foreground"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm text-muted-foreground">
        Tipo de contacto
        <select
          name="contactType"
          className="h-10 rounded-lg border border-input bg-background px-3 text-foreground"
        >
          <option value="phone">Teléfono</option>
          <option value="email">Email</option>
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm text-muted-foreground">
        Contacto
        <input
          name="contactValue"
          placeholder="Opcional"
          className="h-10 rounded-lg border border-input bg-background px-3 text-foreground"
        />
      </label>
      {state.error ? (
        <p role="alert" className="text-sm text-destructive sm:col-span-2">
          {state.error}
        </p>
      ) : null}
      {state.saved ? (
        <p role="status" className="text-sm text-success sm:col-span-2">
          Alumno creado.
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="h-10 rounded-lg bg-primary px-4 font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60 sm:col-start-2"
      >
        {pending ? "Guardando..." : "Agregar alumno"}
      </button>
    </form>
  );
}
