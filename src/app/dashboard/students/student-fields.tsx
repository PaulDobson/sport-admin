"use client";

import { useState, type ComponentProps, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { FieldControl } from "@/presentation/components/primitives";
import type { StudentAdministrationRow } from "@/application/instructor-operations/ports/student-repository-port";

export type StudentBasicFields = Pick<StudentAdministrationRow, "fullName" | "birthDate" | "photoUrl" | "gender" | "heightCm" | "weightKg" | "contactEmail" | "contactPhone" | "emergencyContactName" | "emergencyContactEmail" | "emergencyContactPhone">;

export function StudentField({ defaultValue = "", ...props }: Omit<ComponentProps<"input">, "value" | "onChange">) {
  const [value, setValue] = useState(defaultValue);
  return <FieldControl {...props} value={value} onChange={event => setValue(event.target.value)} />;
}

export function StudentSelect({ defaultValue = "", ...props }: Omit<ComponentProps<"select">, "value" | "onChange">) {
  const [value, setValue] = useState(defaultValue);
  return <select {...props} value={value} onChange={event => setValue(event.target.value)} />;
}

export function StudentCheckbox({ defaultChecked = false, ...props }: Omit<ComponentProps<"input">, "type" | "checked" | "onChange">) {
  const [checked, setChecked] = useState(defaultChecked);
  return <input {...props} type="checkbox" checked={checked} onChange={event => setChecked(event.target.checked)} />;
}

export function OptionalStudentSection({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <details className="group rounded-xl border border-border bg-card">
      <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 p-4 focus-visible:outline-2 focus-visible:outline-primary">
        <span><span className="block font-semibold">{title}</span><span className="mt-1 block text-xs text-muted-foreground">{description}</span></span>
        <ChevronDown className="h-5 w-5 shrink-0 transition-transform group-open:rotate-180" aria-hidden="true" />
      </summary>
      <div className="grid min-w-0 gap-4 border-t border-border p-4 sm:grid-cols-2">{children}</div>
    </details>
  );
}

export function StudentFields({ student }: { student?: StudentBasicFields }) {
  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-border bg-card p-4 sm:p-5" aria-label="Identidad y contacto">
        <h3 className="font-semibold">Identidad y contacto</h3>
        <p className="mt-1 text-sm text-muted-foreground">Solo el nombre es obligatorio. Puedes completar los demás datos después.</p>
        <div className="mt-4 grid min-w-0 gap-4 sm:grid-cols-2">
          <label className="grid min-w-0 gap-2 text-sm">Nombre completo<StudentField name="fullName" autoComplete="name" required defaultValue={student?.fullName ?? ""} /></label>
          <label className="grid min-w-0 gap-2 text-sm">Fecha de nacimiento<StudentField name="birthDate" type="date" defaultValue={student?.birthDate ?? ""} /></label>
          <label className="grid min-w-0 gap-2 text-sm">Correo del alumno<StudentField name="contactEmail" type="email" autoComplete="email" placeholder="alumno@ejemplo.com" defaultValue={student?.contactEmail ?? ""} /></label>
          <label className="grid min-w-0 gap-2 text-sm">Teléfono del alumno<StudentField name="contactPhone" type="tel" autoComplete="tel" placeholder="+56 9 1234 5678" defaultValue={student?.contactPhone ?? ""} /></label>
        </div>
      </section>
      <OptionalStudentSection title="Contacto de emergencia" description="Opcional · A quién contactar ante una emergencia">
        <label className="grid min-w-0 gap-2 text-sm">Nombre de emergencia<StudentField name="emergencyContactName" defaultValue={student?.emergencyContactName ?? ""} /></label>
        <label className="grid min-w-0 gap-2 text-sm">Correo de emergencia<StudentField name="emergencyContactEmail" type="email" defaultValue={student?.emergencyContactEmail ?? ""} /></label>
        <label className="grid min-w-0 gap-2 text-sm">Teléfono de emergencia<StudentField name="emergencyContactPhone" type="tel" defaultValue={student?.emergencyContactPhone ?? ""} /></label>
      </OptionalStudentSection>
      <OptionalStudentSection title="Perfil del alumno" description="Opcional · Foto, género y medidas">
        <label className="grid min-w-0 gap-2 text-sm">URL de la foto<StudentField name="photoUrl" type="url" placeholder="https://..." defaultValue={student?.photoUrl ?? ""} /></label>
        <label className="grid min-w-0 gap-2 text-sm">Género<StudentSelect name="gender" defaultValue={student?.gender ?? ""} className="h-11 min-w-0 rounded-lg border border-input bg-background px-3 text-sm"><option value="">Sin especificar</option><option value="female">Femenino</option><option value="male">Masculino</option><option value="other">Otro</option></StudentSelect></label>
        <label className="grid min-w-0 gap-2 text-sm">Estatura (cm)<StudentField name="heightCm" type="number" min="1" max="300" step="0.1" defaultValue={student?.heightCm ?? ""} /></label>
        <label className="grid min-w-0 gap-2 text-sm">Peso (kg)<StudentField name="weightKg" type="number" min="0.1" max="500" step="0.1" defaultValue={student?.weightKg ?? ""} /></label>
      </OptionalStudentSection>
    </div>
  );
}
