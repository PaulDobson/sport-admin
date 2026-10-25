"use client";

import { useState, type ComponentProps, type ReactNode } from "react";
import {
  ChevronDown,
  User,
  CalendarDays,
  Mail,
  Phone,
  PhoneCall,
  AtSign,
  PhoneOutgoing,
  Image,
  Users,
  Ruler,
  Weight,
  ShieldAlert,
  CreditCard,
  CalendarClock,
  HeartPulse,
} from "lucide-react";
import { FieldControl } from "@/presentation/components/primitives";
import type { StudentAdministrationRow } from "@/application/instructor-operations/ports/student-repository-port";
import type { AssignablePlan } from "@/app/dashboard/finance/actions";

export type StudentBasicFields = Pick<
  StudentAdministrationRow,
  | "fullName"
  | "birthDate"
  | "photoUrl"
  | "gender"
  | "heightCm"
  | "weightKg"
  | "contactEmail"
  | "contactPhone"
  | "emergencyContactName"
  | "emergencyContactEmail"
  | "emergencyContactPhone"
>;

// ---------------------------------------------------------------------------
// Input primitives
// ---------------------------------------------------------------------------

export function StudentField({
  defaultValue = "",
  ...props
}: Omit<ComponentProps<"input">, "value" | "onChange">) {
  const [value, setValue] = useState(defaultValue);
  return (
    <FieldControl
      {...props}
      value={value}
      onChange={(event) => setValue(event.target.value)}
    />
  );
}

export function StudentSelect({
  defaultValue = "",
  ...props
}: Omit<ComponentProps<"select">, "value" | "onChange">) {
  const [value, setValue] = useState(defaultValue);
  return (
    <select
      {...props}
      value={value}
      onChange={(event) => setValue(event.target.value)}
    />
  );
}

export function StudentCheckbox({
  defaultChecked = false,
  ...props
}: Omit<ComponentProps<"input">, "type" | "checked" | "onChange">) {
  const [checked, setChecked] = useState(defaultChecked);
  return (
    <input
      {...props}
      type="checkbox"
      checked={checked}
      onChange={(event) => setChecked(event.target.checked)}
    />
  );
}

// ---------------------------------------------------------------------------
// IconField — labeled input with a left-aligned icon
// ---------------------------------------------------------------------------

interface IconFieldProps extends Omit<
  ComponentProps<"input">,
  "value" | "onChange"
> {
  label: string;
  icon: ReactNode;
  defaultValue?: string;
}

function IconField({
  label,
  icon,
  defaultValue = "",
  ...props
}: IconFieldProps) {
  const [value, setValue] = useState(defaultValue);
  return (
    <label className="grid min-w-0 gap-1.5 text-sm">
      <span className="flex items-center gap-1.5 font-medium text-muted-foreground">
        <span className="text-muted-foreground" aria-hidden="true">
          {icon}
        </span>
        {label}
      </span>
      <FieldControl
        {...props}
        value={value}
        onChange={(event) => setValue(event.target.value)}
      />
    </label>
  );
}

interface IconSelectProps extends Omit<
  ComponentProps<"select">,
  "value" | "onChange"
> {
  label: string;
  icon: ReactNode;
  defaultValue?: string;
  children: ReactNode;
}

function IconSelect({
  label,
  icon,
  defaultValue = "",
  children,
  ...props
}: IconSelectProps) {
  const [value, setValue] = useState(defaultValue);
  return (
    <label className="grid min-w-0 gap-1.5 text-sm">
      <span className="flex items-center gap-1.5 font-medium text-muted-foreground">
        <span className="text-primary/80" aria-hidden="true">
          {icon}
        </span>
        {label}
      </span>
      <select
        {...props}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        className="h-11 min-w-0 rounded-lg border border-input bg-background/50 px-3 text-sm text-foreground transition-colors disabled:cursor-not-allowed disabled:opacity-45"
      >
        {children}
      </select>
    </label>
  );
}

// ---------------------------------------------------------------------------
// OptionalStudentSection — collapsible card with "Opcional" badge
// ---------------------------------------------------------------------------

interface OptionalSectionProps {
  title: string;
  description: string;
  icon: ReactNode;
  children: ReactNode;
}

export function OptionalStudentSection({
  title,
  description,
  icon,
  children,
}: OptionalSectionProps) {
  return (
    <details className="group rounded-xl border border-border bg-card">
      <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 px-4 py-3 focus-visible:outline-2 focus-visible:outline-primary">
        {/* Icon badge */}
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/20"
          aria-hidden="true"
        >
          {icon}
        </span>

        {/* Labels */}
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold">{title}</span>
          <span className="mt-0.5 block text-xs text-muted-foreground">
            {description}
          </span>
        </span>

        {/* Opcional badge + chevron */}
        <span className="flex shrink-0 items-center gap-2">
          <span className="hidden rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground sm:inline">
            Opcional
          </span>
          <ChevronDown
            className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
            aria-hidden="true"
          />
        </span>
      </summary>

      <div className="grid min-w-0 gap-4 border-t border-border p-4 sm:grid-cols-2">
        {children}
      </div>
    </details>
  );
}

// ---------------------------------------------------------------------------
// Required identity & contact section
// ---------------------------------------------------------------------------

export function StudentFields({ student }: { student?: StudentBasicFields }) {
  return (
    <div className="space-y-3">
      {/* ── Required section: identity & contact ── */}
      <section
        className="rounded-xl border border-border bg-card"
        aria-label="Identidad y contacto"
      >
        {/* Section header */}
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/20"
            aria-hidden="true"
          >
            <User className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold">Identidad y contacto</h3>
            <p className="text-xs text-muted-foreground">
              Solo el nombre es obligatorio
            </p>
          </div>
          <span className="ml-auto rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
            Requerido
          </span>
        </div>

        {/* Fields */}
        <div className="grid min-w-0 gap-4 p-4 sm:grid-cols-2">
          <IconField
            label="Nombre completo"
            icon={<User className="h-3.5 w-3.5" />}
            name="fullName"
            autoComplete="name"
            required
            placeholder="Nombre y apellido"
            defaultValue={student?.fullName ?? ""}
            className="sm:col-span-2"
          />
          <IconField
            label="Fecha de nacimiento"
            icon={<CalendarDays className="h-3.5 w-3.5" />}
            name="birthDate"
            type="date"
            defaultValue={student?.birthDate ?? ""}
          />
          <IconField
            label="Correo electrónico"
            icon={<Mail className="h-3.5 w-3.5" />}
            name="contactEmail"
            type="email"
            autoComplete="email"
            placeholder="alumno@ejemplo.com"
            defaultValue={student?.contactEmail ?? ""}
          />
          <IconField
            label="Teléfono"
            icon={<Phone className="h-3.5 w-3.5" />}
            name="contactPhone"
            type="tel"
            autoComplete="tel"
            placeholder="+56 9 1234 5678"
            defaultValue={student?.contactPhone ?? ""}
          />
        </div>
      </section>

      {/* ── Optional: emergency contact ── */}
      <OptionalStudentSection
        title="Contacto de emergencia"
        description="A quién contactar ante una emergencia"
        icon={<PhoneCall className="h-4 w-4" />}
      >
        <IconField
          label="Nombre"
          icon={<User className="h-3.5 w-3.5" />}
          name="emergencyContactName"
          placeholder="Nombre completo"
          defaultValue={student?.emergencyContactName ?? ""}
          className="sm:col-span-2"
        />
        <IconField
          label="Correo"
          icon={<AtSign className="h-3.5 w-3.5" />}
          name="emergencyContactEmail"
          type="email"
          placeholder="emergencia@ejemplo.com"
          defaultValue={student?.emergencyContactEmail ?? ""}
        />
        <IconField
          label="Teléfono"
          icon={<PhoneOutgoing className="h-3.5 w-3.5" />}
          name="emergencyContactPhone"
          type="tel"
          placeholder="+56 9 8765 4321"
          defaultValue={student?.emergencyContactPhone ?? ""}
        />
      </OptionalStudentSection>

      {/* ── Optional: profile ── */}
      <OptionalStudentSection
        title="Perfil del alumno"
        description="Foto, género y medidas corporales"
        icon={<Users className="h-4 w-4" />}
      >
        <IconField
          label="URL de foto"
          icon={<Image className="h-3.5 w-3.5" />}
          name="photoUrl"
          type="url"
          placeholder="https://ejemplo.com/foto.jpg"
          defaultValue={student?.photoUrl ?? ""}
          className="sm:col-span-2"
        />
        <IconSelect
          label="Género"
          icon={<Users className="h-3.5 w-3.5" />}
          name="gender"
          defaultValue={student?.gender ?? ""}
        >
          <option value="">Sin especificar</option>
          <option value="female">Femenino</option>
          <option value="male">Masculino</option>
          <option value="other">Otro</option>
        </IconSelect>
        <div className="grid grid-cols-2 gap-3">
          <IconField
            label="Estatura (cm)"
            icon={<Ruler className="h-3.5 w-3.5" />}
            name="heightCm"
            type="number"
            min="1"
            max="300"
            step="0.1"
            placeholder="170"
            defaultValue={
              student?.heightCm != null ? String(student.heightCm) : ""
            }
          />
          <IconField
            label="Peso (kg)"
            icon={<Weight className="h-3.5 w-3.5" />}
            name="weightKg"
            type="number"
            min="0.1"
            max="500"
            step="0.1"
            placeholder="70"
            defaultValue={
              student?.weightKg != null ? String(student.weightKg) : ""
            }
          />
        </div>
      </OptionalStudentSection>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Billing cycle labels
// ---------------------------------------------------------------------------

const billingCycleLabel: Record<string, string> = {
  monthly: "mensual",
  quarterly: "trimestral",
  semiannual: "semestral",
  annual: "anual",
};

function formatPlanPrice(plan: AssignablePlan) {
  const cycle = billingCycleLabel[plan.billingCycle] ?? plan.billingCycle;
  return `${plan.currency} ${plan.price.toLocaleString("es-CL")} / ${cycle}`;
}

// ---------------------------------------------------------------------------
// MembershipPlanSection
// ---------------------------------------------------------------------------

export function MembershipPlanSection({ plans }: { plans: AssignablePlan[] }) {
  const today = new Date().toISOString().slice(0, 10);
  const [planId, setPlanId] = useState("");
  const [startsOn, setStartsOn] = useState(today);

  if (plans.length === 0) return null;

  return (
    <OptionalStudentSection
      title="Asignar membresía"
      description="Activa un plan desde el primer día"
      icon={<CreditCard className="h-4 w-4" />}
    >
      <label className="grid min-w-0 gap-1.5 text-sm sm:col-span-2">
        <span className="flex items-center gap-1.5 font-medium text-muted-foreground">
          <span className="text-primary/80" aria-hidden="true">
            <CreditCard className="h-3.5 w-3.5" />
          </span>
          Plan de membresía
        </span>
        <select
          name="membershipPlanId"
          value={planId}
          onChange={(e) => setPlanId(e.target.value)}
          className="h-11 min-w-0 rounded-lg border border-input bg-background/50 px-3 text-sm text-foreground transition-colors"
        >
          <option value="">Sin membresía por ahora</option>
          {plans.map((plan) => (
            <option key={plan.id} value={plan.id}>
              {plan.name} — {formatPlanPrice(plan)}
            </option>
          ))}
        </select>
      </label>

      {planId ? (
        <label className="grid min-w-0 gap-1.5 text-sm">
          <span className="flex items-center gap-1.5 font-medium text-muted-foreground">
            <span className="text-primary/80" aria-hidden="true">
              <CalendarClock className="h-3.5 w-3.5" />
            </span>
            Fecha de inicio
          </span>
          <input
            name="membershipStartsOn"
            type="date"
            value={startsOn}
            onChange={(e) => setStartsOn(e.target.value)}
            className="h-11 min-w-0 rounded-lg border border-input bg-background/50 px-3 text-sm text-foreground transition-colors"
          />
        </label>
      ) : null}
    </OptionalStudentSection>
  );
}

// ---------------------------------------------------------------------------
// HealthSection — exported separately so StudentForm can wire the consent logic
// ---------------------------------------------------------------------------

interface HealthSectionProps {
  allergies: string;
  onAllergiesChange: (value: string) => void;
}

export function HealthSection({
  allergies,
  onAllergiesChange,
}: HealthSectionProps) {
  return (
    <OptionalStudentSection
      title="Información de salud"
      description="Alergias con consentimiento explícito"
      icon={<HeartPulse className="h-4 w-4" />}
    >
      <label className="grid min-w-0 gap-1.5 text-sm sm:col-span-2">
        <span className="flex items-center gap-1.5 font-medium text-muted-foreground">
          <span className="text-primary/80" aria-hidden="true">
            <ShieldAlert className="h-3.5 w-3.5" />
          </span>
          Alergias
        </span>
        <textarea
          name="allergies"
          value={allergies}
          onChange={(event) => onAllergiesChange(event.target.value)}
          rows={3}
          placeholder="Describe las alergias conocidas..."
          className="min-w-0 rounded-lg border border-input bg-background/50 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground transition-colors"
        />
      </label>

      <p className="text-xs text-muted-foreground sm:col-span-2">
        Las alergias requieren una política de salud aprobada y consentimiento
        explícito del alumno o su tutor.
      </p>

      {allergies.trim() ? (
        <label className="flex min-h-11 items-start gap-3 text-sm sm:col-span-2">
          <StudentCheckbox
            name="representedConsentConfirmed"
            value="confirmed"
            required
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-input accent-primary"
          />
          <span className="leading-5">
            Confirmo que el alumno o su tutor otorgó consentimiento explícito
            para registrar estos datos de salud.
          </span>
        </label>
      ) : null}
    </OptionalStudentSection>
  );
}
