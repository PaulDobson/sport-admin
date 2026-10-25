"use client";

/**
 * InstructorSetupWizard
 *
 * Entry flow for new instructors to complete the minimum viable setup:
 *
 *   Step 1 — Disciplinas y Ubicación
 *   Step 2 — Primer Plan de Cobro
 *   Step 3 — Primer Alumno
 *
 * Attention model (three layers):
 *
 *   1. WelcomeModal  — auto-opens on the first dashboard visit of the session.
 *                      Centred, full-screen backdrop, scale-in animation.
 *                      sessionStorage prevents re-opening until next session.
 *
 *   2. SetupBanner   — once the modal is dismissed this sticky banner takes
 *                      over. Lives at the top of the content area; visually
 *                      distinct with a gradient background and progress bar.
 *
 *   3. WizardPanel   — the actual 3-step form; slides in as a side panel on
 *                      desktop / bottom-sheet on mobile. Opened from either
 *                      layer above.
 *
 * Accessibility: focus management, aria-live, aria-modal, Escape to close.
 */

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import {
  ArrowRight,
  BadgeCheck,
  Check,
  ChevronRight,
  Dumbbell,
  MapPin,
  Rocket,
  Sparkles,
  Users,
  Wallet,
  X,
} from "lucide-react";
import type { DisciplineOption } from "@/application/instructor-operations/ports/schedule-catalog-port";
import type { DayLocation } from "@/domain/instructor-operations/instructor-day";
import {
  DisciplineCreationForm,
  LocationCreationForm,
} from "@/app/dashboard/schedule/programming-catalog-forms";
import { PlanForm } from "@/app/dashboard/finance/plan-form";
import {
  AssignMembershipFlow,
  type AssignStudent,
} from "@/app/dashboard/finance/assign-membership-sheet";
import { StudentFields } from "@/app/dashboard/students/student-fields";
import {
  createStudentAction,
  type StudentFormState,
} from "@/app/dashboard/students/actions";
import { useActionState } from "react";
import { Button } from "@/presentation/components/primitives";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STEP_COUNT = 4;
const SESSION_KEY = "instructor_setup_modal_shown";

/** Custom DOM event dispatched by the topbar trigger to open the wizard. */
const OPEN_WIZARD_EVENT = "sport:open-setup-wizard";

const stepMeta = [
  {
    id: 1,
    icon: Dumbbell,
    title: "Disciplinas y Ubicación",
    shortLabel: "Disciplinas",
    tooltip: "Selecciona lo que enseñas y dónde entrenas a tus alumnos.",
  },
  {
    id: 2,
    icon: Wallet,
    title: "Plan de Cobro",
    shortLabel: "Plan",
    tooltip:
      "Define el precio de tus servicios. Podrás asignar este plan a uno o varios alumnos.",
  },
  {
    id: 3,
    icon: Users,
    title: "Primer Alumno",
    shortLabel: "Alumno",
    tooltip:
      "Agrega a tu primer cliente para activar su seguimiento deportivo y financiero.",
  },
  {
    id: 4,
    icon: BadgeCheck,
    title: "Asignar Membresía",
    shortLabel: "Membresía",
    tooltip:
      "Asigna un plan al alumno que acabas de registrar y registra su primer pago si corresponde.",
  },
] as const;

// ---------------------------------------------------------------------------
// SetupWizardTopbarButton — exported for use in the desktop topbar.
// Dispatches a DOM custom event that the wizard root picks up to open the
// welcome modal regardless of where it sits in the component tree.
// Only rendered on desktop (hidden on mobile via CSS — mobile uses the banner).
// ---------------------------------------------------------------------------

export function SetupWizardTopbarButton({
  completedCount,
}: {
  completedCount: number;
}) {
  const handleClick = () => {
    window.dispatchEvent(new CustomEvent(OPEN_WIZARD_EVENT));
  };

  const remaining = STEP_COUNT - completedCount;

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={`Configuración inicial: ${remaining} paso${remaining !== 1 ? "s" : ""} pendiente${remaining !== 1 ? "s" : ""}. Abrir asistente.`}
      style={
        {
          // Neon green palette — hardcoded to guarantee contrast on the dark topbar
          // regardless of any theme variable changes.
          "--neon": "#39ff6e",
          "--neon-dim": "#1aff5233",
          "--neon-glow": "#39ff6e55",
        } as React.CSSProperties
      }
      className={[
        "relative hidden lg:inline-flex items-center gap-2 rounded-xl px-3 py-1.5",
        "text-xs font-bold transition-colors",
        // Border + background use the neon palette via CSS vars
        "border border-[var(--neon)] bg-[var(--neon-dim)] text-[var(--neon)]",
        "hover:bg-[#1aff5248]",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--neon)]",
        // Outer glow pulse on the whole button
        "animate-[neon-pulse_2s_ease-in-out_infinite]",
      ].join(" ")}
    >
      {/* Sparkles icon — blinks with scale + rotation */}
      <span className="relative flex h-4 w-4 shrink-0 items-center justify-center">
        <Sparkles
          aria-hidden="true"
          className="relative z-10 h-4 w-4 animate-[neon-blink_1.6s_ease-in-out_infinite]"
        />
        {/* Expanding ping ring in neon green */}
        <span
          aria-hidden="true"
          className="absolute inset-0 rounded-full bg-[var(--neon)] opacity-40 animate-ping"
          style={{ animationDuration: "1.8s" }}
        />
      </span>

      <span>Configurar academia</span>

      {/* Remaining steps badge */}
      <span
        aria-hidden="true"
        className="flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--neon)] px-1 text-[10px] font-black text-black"
      >
        {remaining}
      </span>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Keyframe animations injected as a <style> tag (Tailwind v4 arbitrary
// keyframes syntax is not supported in all setups; a scoped style is safer).
// ---------------------------------------------------------------------------

function WizardStyles() {
  return (
    // suppressHydrationWarning prevents a false hydration mismatch that can
    // occur when a browser extension (e.g. an ad-blocker or style injector)
    // modifies <style> content before React hydrates.  The CSS itself is
    // static, so suppressing the warning here is safe.
    <style suppressHydrationWarning>{`
      @keyframes neon-blink {
        0%, 100% { opacity: 1;    transform: scale(1)    rotate(0deg);  filter: drop-shadow(0 0 3px #39ff6e); }
        35%       { opacity: 0.4; transform: scale(0.82) rotate(-10deg); filter: drop-shadow(0 0 0px #39ff6e); }
        65%       { opacity: 1;   transform: scale(1.18) rotate(8deg);   filter: drop-shadow(0 0 6px #39ff6e); }
      }
      @keyframes neon-pulse {
        0%, 100% { box-shadow: 0 0 0   0   #39ff6e33, 0 0  6px 1px #39ff6e22; }
        50%       { box-shadow: 0 0 0   7px #39ff6e00, 0 0 14px 3px #39ff6e44; }
      }
    `}</style>
  );
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface Props {
  hasDiscipline: boolean;
  hasLocation: boolean;
  hasPlan: boolean;
  hasStudent: boolean;
  hasMembership: boolean;
  tenantCreatedAt: string;
}

// ---------------------------------------------------------------------------
// StepIndicator — shared between modal and wizard panel
// ---------------------------------------------------------------------------

function StepIndicator({
  current,
  completed,
  size = "md",
}: {
  current: number;
  completed: Set<number>;
  size?: "sm" | "md";
}) {
  return (
    <ol
      aria-label="Pasos del asistente de configuración"
      className="flex gap-1.5"
    >
      {stepMeta.map((step, index) => {
        const stepNum = index + 1;
        const done = completed.has(stepNum);
        const active = stepNum === current;
        return (
          <li
            key={step.id}
            aria-current={active ? "step" : undefined}
            className={[
              "flex min-w-0 flex-1 items-center gap-1.5 rounded-full border font-semibold transition-colors",
              size === "sm" ? "px-2 py-1 text-[11px]" : "px-2.5 py-1.5 text-xs",
              active
                ? "border-primary/40 bg-primary/10 text-primary"
                : done
                  ? "border-success/30 bg-success/10 text-success"
                  : "border-border text-muted-foreground",
            ].join(" ")}
          >
            <span aria-hidden="true" className="shrink-0">
              {done ? (
                <Check className="h-3 w-3" />
              ) : (
                <span
                  className={[
                    "flex items-center justify-center rounded-full border border-current",
                    size === "sm"
                      ? "h-3.5 w-3.5 text-[9px]"
                      : "h-4 w-4 text-[10px]",
                  ].join(" ")}
                >
                  {stepNum}
                </span>
              )}
            </span>
            <span className="truncate">{step.shortLabel}</span>
          </li>
        );
      })}
    </ol>
  );
}

// ---------------------------------------------------------------------------
// ProgressBar — visual completion indicator
// ---------------------------------------------------------------------------

function ProgressBar({
  completed,
  total,
}: {
  completed: number;
  total: number;
}) {
  const pct = Math.round((completed / total) * 100);
  return (
    <div
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`${completed} de ${total} pasos completados`}
      className="h-1.5 w-full overflow-hidden rounded-full bg-primary/15"
    >
      <div
        className="h-full rounded-full bg-primary transition-all duration-500"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// WelcomeModal — auto-shown on first visit of the session
// ---------------------------------------------------------------------------

function WelcomeModal({
  completedCount,
  onOpen,
  onDismiss,
}: {
  completedCount: number;
  onOpen: () => void;
  onDismiss: () => void;
}) {
  const headingId = useId();
  const modalRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  // Animate in after mount
  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  // Focus first element
  useEffect(() => {
    modalRef.current
      ?.querySelector<HTMLElement>(
        'button, [href], input, select, [tabindex]:not([tabindex="-1"])',
      )
      ?.focus();
  }, []);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") onDismiss();
  };

  return (
    <>
      {/* Backdrop */}
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: backdrop click is supplemental; Escape is handled on the dialog */}
      <div
        aria-hidden="true"
        className={[
          "fixed inset-0 z-50 bg-black/60 backdrop-blur-sm transition-opacity duration-300",
          visible ? "opacity-100" : "opacity-0",
        ].join(" ")}
        onClick={onDismiss}
      />

      {/* Dialog */}
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        onKeyDown={handleKeyDown}
        className={[
          "fixed inset-x-4 top-1/2 z-50 mx-auto max-w-md -translate-y-1/2 rounded-2xl border border-border bg-card p-6 shadow-2xl transition-all duration-300 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:p-8",
          visible ? "scale-100 opacity-100" : "scale-95 opacity-0",
        ].join(" ")}
      >
        {/* Close */}
        <button
          type="button"
          aria-label="Cerrar bienvenida"
          onClick={onDismiss}
          className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-surface-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <X aria-hidden="true" className="h-4 w-4" />
        </button>

        {/* Icon */}
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-primary/10 text-primary">
          <Rocket aria-hidden="true" className="h-8 w-8" />
        </div>

        {/* Copy */}
        <div className="mt-5 text-center">
          <h2
            id={headingId}
            className="text-xl font-bold tracking-tight text-foreground sm:text-2xl"
          >
            ¡Bienvenido a tu academia!
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Estás a{" "}
            <strong className="text-foreground">
              {STEP_COUNT - completedCount} paso
              {STEP_COUNT - completedCount !== 1 ? "s" : ""}
            </strong>{" "}
            de tener todo listo para operar: disciplinas, plan de cobro y tu
            primer alumno.
          </p>
        </div>

        {/* Progress */}
        <div className="mt-5 space-y-2">
          <ProgressBar completed={completedCount} total={STEP_COUNT} />
          <p className="text-center text-xs text-muted-foreground">
            {completedCount} de {STEP_COUNT} completados
          </p>
        </div>

        {/* Steps preview */}
        <ul className="mt-5 space-y-2">
          {stepMeta.map((step, index) => {
            const stepNum = index + 1;
            const done = completedCount >= stepNum;
            const StepIcon = step.icon;
            return (
              <li
                key={step.id}
                className={[
                  "flex items-center gap-3 rounded-xl border p-3 text-sm",
                  done
                    ? "border-success/25 bg-success/8 text-success"
                    : "border-border bg-surface-raised/50 text-foreground",
                ].join(" ")}
              >
                <span
                  className={[
                    "grid h-8 w-8 shrink-0 place-items-center rounded-lg",
                    done ? "bg-success/15" : "bg-primary/10 text-primary",
                  ].join(" ")}
                >
                  {done ? (
                    <Check aria-hidden="true" className="h-4 w-4" />
                  ) : (
                    <StepIcon aria-hidden="true" className="h-4 w-4" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{step.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {step.tooltip}
                  </p>
                </div>
                {done && (
                  <Check
                    aria-hidden="true"
                    className="h-4 w-4 shrink-0 text-success"
                  />
                )}
              </li>
            );
          })}
        </ul>

        {/* CTAs */}
        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={onOpen}
            className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-transparent bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            Empezar configuración
            <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onDismiss}
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-border px-4 text-sm font-semibold text-muted-foreground transition-colors hover:bg-surface-raised hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            Ahora no
          </button>
        </div>

        <p className="mt-3 text-center text-xs text-muted-foreground">
          Puedes retomar esto en cualquier momento desde el panel.
        </p>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// SetupBanner — inline banner shown after modal is dismissed
// ---------------------------------------------------------------------------

function SetupBanner({
  completedCount,
  completed,
  currentStep,
  onOpen,
  onDismiss,
}: {
  completedCount: number;
  completed: Set<number>;
  currentStep: number;
  onOpen: () => void;
  onDismiss: () => void;
}) {
  const remaining = STEP_COUNT - completedCount;
  return (
    <div
      role="region"
      aria-label="Configuración inicial pendiente"
      className="mx-auto max-w-6xl px-4 pt-4 sm:px-6"
    >
      <div className="overflow-hidden rounded-2xl border border-primary/25 bg-linear-to-r from-primary/12 via-primary/6 to-card shadow-sm">
        {/* Progress bar at the very top */}
        <ProgressBar completed={completedCount} total={STEP_COUNT} />

        <div className="flex flex-wrap items-center gap-4 px-5 py-4">
          {/* Icon */}
          <div className="hidden shrink-0 sm:grid h-11 w-11 place-items-center rounded-xl bg-primary/15 text-primary">
            <Rocket aria-hidden="true" className="h-5 w-5" />
          </div>

          {/* Text */}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-foreground">
              {remaining === 1
                ? "Un último paso para activar tu academia"
                : `${remaining} pasos para tener todo listo`}
            </p>
            <div className="mt-1.5 hidden sm:block">
              <StepIndicator
                current={currentStep}
                completed={completed}
                size="sm"
              />
            </div>
            <p className="mt-1 text-xs text-muted-foreground sm:hidden">
              {completedCount} de {STEP_COUNT} pasos completados
            </p>
          </div>

          {/* CTA */}
          <button
            type="button"
            onClick={onOpen}
            className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-xl border border-transparent bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            Continuar
            <ChevronRight aria-hidden="true" className="h-4 w-4" />
          </button>

          {/* Dismiss */}
          <button
            type="button"
            aria-label="Ocultar banner de configuración"
            onClick={onDismiss}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-primary/10 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <X aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 1 — Disciplinas & Ubicación
// ---------------------------------------------------------------------------

function Step1Content({
  onDisciplineCreated,
  onLocationCreated,
  hasDisciplineNow,
  hasLocationNow,
}: {
  onDisciplineCreated: (value: DisciplineOption) => void;
  onLocationCreated: (value: DayLocation) => void;
  hasDisciplineNow: boolean;
  hasLocationNow: boolean;
}) {
  return (
    <div className="space-y-4">
      <details
        open={!hasDisciplineNow}
        className="group overflow-hidden rounded-xl border border-border bg-card transition-colors open:border-primary/40"
      >
        <summary className="flex min-h-16 cursor-pointer list-none items-center gap-3 px-4 py-3 text-left focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary [&::-webkit-details-marker]:hidden">
          <span
            className={[
              "grid h-9 w-9 shrink-0 place-items-center rounded-lg",
              hasDisciplineNow
                ? "bg-success/10 text-success"
                : "bg-primary/10 text-primary",
            ].join(" ")}
          >
            {hasDisciplineNow ? (
              <Check aria-hidden="true" className="h-4 w-4" />
            ) : (
              <Dumbbell aria-hidden="true" className="h-4 w-4" />
            )}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-foreground">
              Añadir una disciplina
            </span>
            <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
              {hasDisciplineNow
                ? "✓ Disciplina registrada. Añade otra si quieres."
                : "Yoga, CrossFit, Fútbol… ¿qué enseñas?"}
            </span>
          </span>
        </summary>
        <div className="border-t border-border px-4 py-4">
          <DisciplineCreationForm onCreated={onDisciplineCreated} />
        </div>
      </details>

      <details
        open={hasDisciplineNow && !hasLocationNow}
        className="group overflow-hidden rounded-xl border border-border bg-card transition-colors open:border-primary/40"
      >
        <summary className="flex min-h-16 cursor-pointer list-none items-center gap-3 px-4 py-3 text-left focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary [&::-webkit-details-marker]:hidden">
          <span
            className={[
              "grid h-9 w-9 shrink-0 place-items-center rounded-lg",
              hasLocationNow
                ? "bg-success/10 text-success"
                : "bg-primary/10 text-primary",
            ].join(" ")}
          >
            {hasLocationNow ? (
              <Check aria-hidden="true" className="h-4 w-4" />
            ) : (
              <MapPin aria-hidden="true" className="h-4 w-4" />
            )}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-foreground">
              Registrar una ubicación
            </span>
            <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
              {hasLocationNow
                ? "✓ Ubicación registrada."
                : "Parque, gimnasio, domicilio o en línea."}
            </span>
          </span>
        </summary>
        <div className="border-t border-border px-4 py-4">
          <LocationCreationForm onCreated={onLocationCreated} />
        </div>
      </details>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 2 — Plan de Cobro
// ---------------------------------------------------------------------------

function Step2Content({ onPlanCreated }: { onPlanCreated: () => void }) {
  return <PlanForm compact onSaved={onPlanCreated} />;
}

// ---------------------------------------------------------------------------
// Step 3 — Primer Alumno
// ---------------------------------------------------------------------------

const initialStudentState: StudentFormState = { error: null, saved: false };

function Step3Content({
  onStudentCreated,
}: {
  onStudentCreated: (student: AssignStudent) => void;
}) {
  const [state, formAction, pending] = useActionState(
    createStudentAction,
    initialStudentState,
  );
  const created = Boolean(state.createdStudentId || state.saved);
  // Keep a ref to the last submitted name so we can pass it to Step4
  const pendingNameRef = useRef("");

  useEffect(() => {
    if (state.createdStudentId) {
      onStudentCreated({
        id: state.createdStudentId,
        fullName: pendingNameRef.current || "Alumno registrado",
      });
    } else if (state.saved) {
      onStudentCreated({ id: "", fullName: pendingNameRef.current });
    }
  }, [state.createdStudentId, state.saved, onStudentCreated]);

  return (
    <form
      action={formAction}
      className="space-y-4"
      onSubmit={(event) => {
        const data = new FormData(event.currentTarget);
        pendingNameRef.current = String(data.get("fullName") ?? "").trim();
      }}
    >
      <fieldset disabled={pending || created} className="min-w-0 space-y-4">
        <StudentFields />
      </fieldset>

      {state.error ? (
        <p
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
        >
          {state.error}
        </p>
      ) : null}

      {!created ? (
        <Button
          type="submit"
          variant="primary"
          isLoading={pending}
          className="w-full min-h-11"
        >
          {pending ? "Guardando…" : "Registrar alumno"}
        </Button>
      ) : (
        <div className="flex items-center gap-2 rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-sm text-success">
          <Check className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>Alumno registrado correctamente.</span>
        </div>
      )}
    </form>
  );
}

// ---------------------------------------------------------------------------
// Step 4 — Asignar Membresía
// ---------------------------------------------------------------------------

function Step4Content({
  student,
  onDone,
}: {
  student: AssignStudent | null;
  onDone: () => void;
}) {
  if (!student) {
    // Shouldn't happen in normal flow, but degrade gracefully.
    return (
      <p className="text-sm text-muted-foreground">
        Registra primero un alumno en el paso anterior para poder asignarle una
        membresía.
      </p>
    );
  }
  return <AssignMembershipFlow initialStudent={student} onDone={onDone} />;
}

// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------

function WizardPanel({
  open,
  onClose,
  currentStep,
  setCurrentStep,
  completed,
  markCompleted,
  hasDisciplineNow,
  setHasDisciplineNow,
  hasLocationNow,
  setHasLocationNow,
  createdStudentId,
  createdStudent,
  setCreatedStudent,
  onDismissAll,
}: {
  open: boolean;
  onClose: () => void;
  currentStep: number;
  setCurrentStep: (step: number) => void;
  completed: Set<number>;
  markCompleted: (step: number) => void;
  hasDisciplineNow: boolean;
  setHasDisciplineNow: (v: boolean) => void;
  hasLocationNow: boolean;
  setHasLocationNow: (v: boolean) => void;
  /** @deprecated kept for the "all done" CTA link — use createdStudent for full data */
  createdStudentId: string | null;
  createdStudent: AssignStudent | null;
  setCreatedStudent: (student: AssignStudent) => void;
  onDismissAll: () => void;
}) {
  const modalRef = useRef<HTMLDivElement>(null);
  const headingId = useId();
  const liveId = useId();

  const completedCount = completed.size;
  const allDone = completedCount === STEP_COUNT;
  const currentMeta = stepMeta[currentStep - 1];
  const Icon = currentMeta.icon;

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") onClose();
  };

  useEffect(() => {
    if (!open) return;
    modalRef.current
      ?.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      )
      ?.focus();
  }, [open]);

  // Advance to the next incomplete step automatically whenever `completed`
  // changes. Using an effect (instead of setTimeout + closure) avoids stale
  // captures and survives Next.js route revalidations that re-render the tree.
  useEffect(() => {
    if (completed.has(3) && !completed.has(4) && currentStep === 3) {
      const timer = window.setTimeout(() => setCurrentStep(4), 700);
      return () => window.clearTimeout(timer);
    }
    if (completed.has(2) && !completed.has(3) && currentStep === 2) {
      const timer = window.setTimeout(() => setCurrentStep(3), 700);
      return () => window.clearTimeout(timer);
    }
    if (completed.has(1) && !completed.has(2) && currentStep === 1) {
      const timer = window.setTimeout(() => setCurrentStep(2), 700);
      return () => window.clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [completed]);

  return (
    <>
      {/* Backdrop */}
      {open && (
        // biome-ignore lint/a11y/useKeyWithClickEvents: backdrop dismissal is supplemental; Escape closes via dialog onKeyDown
        <div
          aria-hidden="true"
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        />
      )}

      {/* Panel */}
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        aria-describedby={liveId}
        onKeyDown={handleKeyDown}
        className={[
          "fixed z-50 flex flex-col bg-card shadow-2xl transition-transform duration-300",
          "bottom-0 left-0 right-0 max-h-[90dvh] rounded-t-2xl border-t border-border",
          "sm:bottom-0 sm:right-0 sm:top-0 sm:left-auto sm:h-full sm:w-[28rem] sm:max-h-none sm:rounded-none sm:rounded-l-2xl sm:border-l sm:border-t-0",
          open
            ? "translate-y-0 sm:translate-x-0"
            : "translate-y-full sm:translate-x-full",
        ].join(" ")}
      >
        {/* Header */}
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-border px-5 py-4">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">
              Primeros pasos
            </p>
            <h2
              id={headingId}
              className="mt-1 text-lg font-bold text-foreground"
            >
              Configura tu academia
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {allDone
                ? "¡Listo! Tu academia está configurada."
                : `${STEP_COUNT - completedCount} paso${STEP_COUNT - completedCount !== 1 ? "s" : ""} para empezar a operar.`}
            </p>
          </div>
          <button
            type="button"
            aria-label="Cerrar asistente"
            onClick={onClose}
            className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-surface-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <X aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>

        {/* Step indicator */}
        <div className="shrink-0 px-5 pt-4 pb-2">
          <StepIndicator current={currentStep} completed={completed} />
        </div>

        {/* Live region */}
        <div
          id={liveId}
          aria-live="polite"
          aria-atomic="true"
          className="sr-only"
        >
          {allDone
            ? "Configuración completa."
            : `Paso ${currentStep} de ${STEP_COUNT}: ${currentMeta.title}.`}
        </div>

        {/* Tab navigation */}
        <div
          className="shrink-0 flex gap-1 px-5 py-2"
          role="tablist"
          aria-label="Pasos"
        >
          {stepMeta.map((meta, index) => {
            const stepNum = index + 1;
            const StepIcon = meta.icon;
            const isDone = completed.has(stepNum);
            const isActive = currentStep === stepNum;
            return (
              <button
                key={meta.id}
                role="tab"
                aria-selected={isActive}
                aria-controls={`wizard-step-panel-${stepNum}`}
                type="button"
                onClick={() => setCurrentStep(stepNum)}
                className={[
                  "flex flex-1 items-center justify-center gap-1.5 rounded-lg border py-2 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                  isActive
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : isDone
                      ? "border-success/20 bg-success/8 text-success"
                      : "border-border bg-transparent text-muted-foreground hover:bg-surface-raised",
                ].join(" ")}
              >
                {isDone && !isActive ? (
                  <Check aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
                ) : (
                  <StepIcon
                    aria-hidden="true"
                    className="h-3.5 w-3.5 shrink-0"
                  />
                )}
                <span className="hidden sm:inline truncate">
                  {meta.shortLabel}
                </span>
              </button>
            );
          })}
        </div>

        {/* Scrollable content */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="space-y-4 px-5 pb-6 pt-2">
            {/* Step header card */}
            <div
              className="flex items-start gap-3 rounded-xl border border-border bg-surface-raised/50 p-4"
              role="note"
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                <Icon aria-hidden="true" className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="font-semibold text-foreground">
                  {currentMeta.title}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {currentMeta.tooltip}
                </p>
              </div>
            </div>

            {/* Step 1 */}
            <div
              id="wizard-step-panel-1"
              role="tabpanel"
              hidden={currentStep !== 1}
            >
              {currentStep === 1 && (
                <Step1Content
                  hasDisciplineNow={hasDisciplineNow}
                  hasLocationNow={hasLocationNow}
                  onDisciplineCreated={(value) => {
                    setHasDisciplineNow(true);
                    if (hasLocationNow) markCompleted(1);
                    void value;
                  }}
                  onLocationCreated={(value) => {
                    setHasLocationNow(true);
                    if (hasDisciplineNow) markCompleted(1);
                    void value;
                  }}
                />
              )}
            </div>

            {/* Step 2 */}
            <div
              id="wizard-step-panel-2"
              role="tabpanel"
              hidden={currentStep !== 2}
            >
              {currentStep === 2 && (
                <Step2Content
                  onPlanCreated={() => {
                    markCompleted(2);
                  }}
                />
              )}
            </div>

            {/* Step 3 */}
            <div
              id="wizard-step-panel-3"
              role="tabpanel"
              hidden={currentStep !== 3}
            >
              {currentStep === 3 && (
                <Step3Content
                  onStudentCreated={(student) => {
                    setCreatedStudent(student);
                    markCompleted(3);
                  }}
                />
              )}
            </div>

            {/* Step 4 */}
            <div
              id="wizard-step-panel-4"
              role="tabpanel"
              hidden={currentStep !== 4}
            >
              {currentStep === 4 && (
                <Step4Content
                  student={createdStudent}
                  onDone={() => {
                    markCompleted(4);
                  }}
                />
              )}
            </div>

            {/* All done */}
            {allDone && (
              <div
                role="status"
                className="space-y-4 rounded-2xl border border-success/30 bg-success/8 p-5 text-center"
              >
                <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-success/15 text-success">
                  <Check aria-hidden="true" className="h-6 w-6" />
                </div>
                <div>
                  <p className="font-bold text-foreground">
                    ¡Tu academia está lista!
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Ya puedes programar clases, hacer seguimiento de alumnos y
                    gestionar cobros.
                  </p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
                  {createdStudentId && (
                    <a
                      href={`/dashboard/students/${createdStudentId}`}
                      className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-primary bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                    >
                      <Users aria-hidden="true" className="h-4 w-4" />
                      Ver ficha del alumno
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onDismissAll();
                    }}
                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-border bg-surface-raised px-4 text-sm font-semibold text-foreground transition-colors hover:bg-surface-overlay"
                  >
                    Ir al panel
                    <ChevronRight aria-hidden="true" className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        {!allDone && (
          <div className="shrink-0 border-t border-border px-5 py-3">
            <button
              type="button"
              onClick={() => {
                onClose();
                onDismissAll();
              }}
              className="group flex w-full items-center justify-between gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-surface-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <span className="text-xs font-semibold text-muted-foreground transition-colors group-hover:text-foreground">
                Puedes completar esto más tarde
              </span>
              <span className="shrink-0 rounded-md border border-border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground transition-colors group-hover:border-foreground/20 group-hover:text-foreground">
                Cerrar
              </span>
            </button>
          </div>
        )}
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Root export
// ---------------------------------------------------------------------------

export function InstructorSetupWizard({
  hasDiscipline,
  hasLocation,
  hasPlan,
  hasStudent,
  hasMembership,
}: Props) {
  // Derived initial state
  const step1Done = hasDiscipline && hasLocation;
  const initialCompleted = new Set<number>(
    [
      step1Done ? 1 : null,
      hasPlan ? 2 : null,
      hasStudent ? 3 : null,
      hasMembership ? 4 : null,
    ].filter(Boolean) as number[],
  );
  const firstIncomplete = !step1Done
    ? 1
    : !hasPlan
      ? 2
      : !hasStudent
        ? 3
        : !hasMembership
          ? 4
          : 1;

  // Attention layer: "modal" | "banner" | "none"
  // Lazy initializer reads sessionStorage on the client; falls back to "none" during SSR.
  const [layer, setLayer] = useState<"modal" | "banner" | "none">(() => {
    if (typeof window === "undefined") return "none";
    return sessionStorage.getItem(SESSION_KEY) === "1" ? "banner" : "modal";
  });
  const [panelOpen, setPanelOpen] = useState(false);

  // Wizard state
  const [currentStep, setCurrentStep] = useState(firstIncomplete);
  const [completed, setCompleted] = useState<Set<number>>(initialCompleted);
  const [hasDisciplineNow, setHasDisciplineNow] = useState(hasDiscipline);
  const [hasLocationNow, setHasLocationNow] = useState(hasLocation);
  const [createdStudentId, setCreatedStudentId] = useState<string | null>(null);
  const [createdStudent, setCreatedStudent] = useState<AssignStudent | null>(
    null,
  );

  const completedCount = completed.size;
  const allDone = completedCount === STEP_COUNT;

  // Auto-collapse banner when all steps are done.
  // Derived during render instead of in an effect to avoid cascading renders.
  const effectiveLayer = allDone ? "none" : layer;

  // Listen for the topbar trigger event to (re)open the welcome modal
  useEffect(() => {
    const handleOpenEvent = () => {
      if (allDone) return;
      setLayer("modal");
      setPanelOpen(false);
    };
    window.addEventListener(OPEN_WIZARD_EVENT, handleOpenEvent);
    return () => window.removeEventListener(OPEN_WIZARD_EVENT, handleOpenEvent);
  }, [allDone]);
  const markCompleted = (step: number) => {
    setCompleted((prev) => {
      const next = new Set(prev);
      next.add(step);
      return next;
    });
  };

  const openPanel = () => {
    // Mark modal as shown for the session
    sessionStorage.setItem(SESSION_KEY, "1");
    setLayer("banner");
    setPanelOpen(true);
  };

  const dismissModal = () => {
    sessionStorage.setItem(SESSION_KEY, "1");
    setLayer("banner");
  };

  const dismissBanner = () => {
    setLayer("none");
  };

  const dismissAll = () => {
    setLayer("none");
  };

  if (effectiveLayer === "none" && !panelOpen) return null;

  return (
    <>
      <WizardStyles />

      {/* Layer 1: Welcome modal (first visit of session) */}
      {effectiveLayer === "modal" && (
        <WelcomeModal
          completedCount={completedCount}
          onOpen={openPanel}
          onDismiss={dismissModal}
        />
      )}

      {/* Layer 2: Inline banner (after modal dismissed) */}
      {effectiveLayer === "banner" && !allDone && (
        <SetupBanner
          completedCount={completedCount}
          completed={completed}
          currentStep={currentStep}
          onOpen={() => setPanelOpen(true)}
          onDismiss={dismissBanner}
        />
      )}

      {/* Layer 3: Wizard panel (opened from either layer) */}
      <WizardPanel
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        currentStep={currentStep}
        setCurrentStep={setCurrentStep}
        completed={completed}
        markCompleted={markCompleted}
        hasDisciplineNow={hasDisciplineNow}
        setHasDisciplineNow={setHasDisciplineNow}
        hasLocationNow={hasLocationNow}
        setHasLocationNow={setHasLocationNow}
        createdStudentId={createdStudentId}
        createdStudent={createdStudent}
        setCreatedStudent={(student) => {
          setCreatedStudentId(student.id);
          setCreatedStudent(student);
        }}
        onDismissAll={dismissAll}
      />
    </>
  );
}
