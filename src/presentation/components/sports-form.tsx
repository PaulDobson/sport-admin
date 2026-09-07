"use client";

import { useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  Check,
  CreditCard,
  GraduationCap,
  Plus,
  UserRound,
} from "lucide-react";

const inputClass =
  "mt-2 h-11 w-full rounded-xl border border-border bg-background/50 px-3 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20";
const labelClass =
  "text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className={labelClass}>{label}</span>
      {children}
    </label>
  );
}

function FormHeader({
  icon: Icon,
  eyebrow,
  title,
  description,
}: {
  icon: React.ElementType;
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3 border-b border-border/70 pb-5">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary">
        <Icon size={19} />
      </div>
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
          {eyebrow}
        </p>
        <h2 className="mt-1 text-xl font-medium tracking-tight">{title}</h2>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          {description}
        </p>
      </div>
    </div>
  );
}

export function StudentRegistrationForm() {
  const [saved, setSaved] = useState(false);
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        setSaved(true);
      }}
      className="rounded-[1.5rem] border border-border bg-card p-5 shadow-2xl shadow-black/10 sm:p-6"
    >
      <FormHeader
        icon={UserRound}
        eyebrow="Registro de alumno"
        title="Nuevo integrante"
        description="Añade un deportista al plantel y asigna su categoría."
      />
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <Field label="Nombre">
          <input required className={inputClass} placeholder="Lucía" />
        </Field>
        <Field label="Apellidos">
          <input required className={inputClass} placeholder="Martínez" />
        </Field>
        <Field label="Fecha de nacimiento">
          <input required type="date" className={inputClass} />
        </Field>
        <Field label="Categoría">
          <select className={inputClass} defaultValue="sub-16">
            <option value="sub-16">Sub-16</option>
            <option value="sub-18">Sub-18</option>
            <option value="senior">Senior</option>
          </select>
        </Field>
        <Field label="Posición">
          <select className={inputClass} defaultValue="mediocampo">
            <option value="mediocampo">Mediocampo</option>
            <option value="defensa">Defensa</option>
            <option value="ataque">Ataque</option>
          </select>
        </Field>
        <Field label="Teléfono de contacto">
          <input className={inputClass} placeholder="+34 600 000 000" />
        </Field>
      </div>
      <div className="mt-5 flex items-center justify-between gap-3">
        <span className="text-xs text-muted-foreground">
          {saved
            ? "Alumno guardado correctamente"
            : "Los campos marcados son obligatorios"}
        </span>
        <button
          type="submit"
          className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
        >
          {saved ? (
            <Check data-icon="inline-start" />
          ) : (
            <Plus data-icon="inline-start" />
          )}{" "}
          {saved ? "Guardado" : "Registrar alumno"}
        </button>
      </div>
    </form>
  );
}

export function PaymentForm() {
  const [paid, setPaid] = useState(false);
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        setPaid(true);
      }}
      className="rounded-[1.5rem] border border-border bg-card p-5 shadow-2xl shadow-black/10 sm:p-6"
    >
      <FormHeader
        icon={CreditCard}
        eyebrow="Gestión de cobros"
        title="Registrar pago"
        description="Controla cuotas, conceptos y estado de facturación."
      />
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <Field label="Alumno">
          <select className={inputClass} defaultValue="lucia">
            <option value="lucia">Lucía Martínez</option>
            <option value="marcos">Marcos Díaz</option>
            <option value="ines">Inés Romero</option>
          </select>
        </Field>
        <Field label="Concepto">
          <select className={inputClass} defaultValue="cuota">
            <option value="cuota">Cuota mensual</option>
            <option value="matricula">Matrícula</option>
            <option value="equipacion">Equipación</option>
          </select>
        </Field>
        <Field label="Importe">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
              €
            </span>
            <input
              required
              type="number"
              step="0.01"
              className={`${inputClass} pl-8`}
              placeholder="45.00"
            />
          </div>
        </Field>
        <Field label="Fecha de cobro">
          <input required type="date" className={inputClass} />
        </Field>
        <Field label="Método de pago">
          <select className={inputClass} defaultValue="transferencia">
            <option value="transferencia">Transferencia bancaria</option>
            <option value="tarjeta">Tarjeta</option>
            <option value="efectivo">Efectivo</option>
          </select>
        </Field>
        <Field label="Referencia">
          <input className={inputClass} placeholder="OP-2026-0048" />
        </Field>
      </div>
      <div className="mt-5 flex items-center justify-between gap-3">
        <span className="text-xs text-muted-foreground">
          {paid
            ? "Cobro registrado correctamente"
            : "El importe se valida antes de guardar"}
        </span>
        <button
          type="submit"
          className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
        >
          {paid ? (
            <Check data-icon="inline-start" />
          ) : (
            <CreditCard data-icon="inline-start" />
          )}{" "}
          {paid ? "Registrado" : "Registrar cobro"}
        </button>
      </div>
    </form>
  );
}

export function AcademyForm() {
  const [created, setCreated] = useState(false);
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        setCreated(true);
      }}
      className="rounded-[1.5rem] border border-border bg-card p-5 shadow-2xl shadow-black/10 sm:p-6"
    >
      <FormHeader
        icon={GraduationCap}
        eyebrow="Configuración"
        title="Nueva academia"
        description="Crea una sede deportiva y define sus datos operativos."
      />
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <Field label="Nombre de la academia">
          <input required className={inputClass} placeholder="Cantera Norte" />
        </Field>
        <Field label="Disciplina">
          <select className={inputClass} defaultValue="futbol">
            <option value="futbol">Fútbol</option>
            <option value="baloncesto">Baloncesto</option>
            <option value="atletismo">Atletismo</option>
          </select>
        </Field>
        <Field label="Ciudad">
          <input required className={inputClass} placeholder="Madrid" />
        </Field>
        <Field label="Código postal">
          <input className={inputClass} placeholder="28001" />
        </Field>
        <Field label="Email de contacto">
          <input
            required
            type="email"
            className={inputClass}
            placeholder="hola@canteranorte.es"
          />
        </Field>
        <Field label="Temporada">
          <select className={inputClass} defaultValue="2026">
            <option value="2026">Temporada 2026</option>
            <option value="2027">Temporada 2027</option>
          </select>
        </Field>
      </div>
      <div className="mt-5 flex items-center justify-between gap-3">
        <span className="text-xs text-muted-foreground">
          {created
            ? "Academia creada correctamente"
            : "Podrás editar estos datos después"}
        </span>
        <button
          type="submit"
          className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
        >
          {created ? (
            <Check data-icon="inline-start" />
          ) : (
            <ArrowRight data-icon="inline-start" />
          )}{" "}
          {created ? "Creada" : "Crear academia"}
        </button>
      </div>
    </form>
  );
}

export function FormsShowcase() {
  return (
    <section aria-labelledby="forms-title" className="mt-10">
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
            Componentes reutilizables
          </p>
          <h2
            id="forms-title"
            className="mt-1 text-2xl font-medium tracking-tight"
          >
            Operación deportiva
          </h2>
          <p className="mt-1 max-w-xl text-sm leading-6 text-muted-foreground">
            Formularios preparados para altas, cobros y configuración de
            academias.
          </p>
        </div>
        <CalendarDays className="hidden text-primary/70 sm:block" size={22} />
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        <StudentRegistrationForm />
        <PaymentForm />
        <div className="xl:col-span-2">
          <AcademyForm />
        </div>
      </div>
    </section>
  );
}
