"use client";

import Link from "next/link";
import {
  useActionState,
  useEffect,
  useId,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { Check } from "lucide-react";
import { cycleEnd } from "@/domain/instructor-finance/dashboard";
import { formatShortDate, localIsoDate } from "@/lib/format-date";
import { formatMoney } from "@/lib/format-money";
import { BottomSheet } from "@/presentation/components/bottom-sheet";
import { MoneyInput } from "@/presentation/components/form-controls";
import { Button, ToneBadge } from "@/presentation/components/primitives";
import {
  assignMembershipAction,
  listAssignablePlansAction,
  searchAssignableStudentsAction,
  type AssignablePlan,
  type AssignableStudent,
  type AssignMembershipState,
} from "./actions";
import { PlanForm } from "./plan-form";
import { billingCycleLabels, billingCycleNouns } from "./plan-templates";

export interface AssignStudent {
  id: string;
  fullName: string;
}

type Step = "student" | "plan" | "confirm";

const stepLabels: Record<Step, string> = {
  student: "Alumno",
  plan: "Plan",
  confirm: "Confirmar",
};

const searchDebounceMs = 250;

const initialState: AssignMembershipState = { status: "idle", error: null };

const fieldClass =
  "h-11 w-full rounded-lg border border-input bg-background px-3 text-foreground";

const optionClass =
  "grid min-h-11 w-full gap-1 rounded-xl border border-border bg-surface-raised/50 p-3 text-left transition-colors hover:border-primary/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary aria-pressed:border-primary aria-pressed:bg-primary/10";

function StepIndicator({ steps, current }: { steps: Step[]; current: Step }) {
  const index = steps.indexOf(current);
  return (
    <ol aria-label="Pasos de la asignación" className="flex gap-2">
      {steps.map((step, position) => {
        const done = position < index;
        const active = step === current;
        return (
          <li
            key={step}
            aria-current={active ? "step" : undefined}
            className={`flex min-w-0 flex-1 items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${
              active
                ? "border-primary/40 bg-primary/10 text-primary"
                : done
                  ? "border-success/30 bg-success/10 text-success"
                  : "border-border text-muted-foreground"
            }`}
          >
            <span aria-hidden="true">
              {done ? <Check className="h-3.5 w-3.5" /> : position + 1}
            </span>
            <span className="truncate">{stepLabels[step]}</span>
          </li>
        );
      })}
    </ol>
  );
}

function StudentStep({ onSelect }: { onSelect: (student: AssignStudent) => void }) {
  const searchId = useId();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AssignableStudent[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [loading, startLoading] = useTransition();

  useEffect(() => {
    let cancelled = false;
    const timeout = window.setTimeout(() => {
      startLoading(async () => {
        try {
          const students = await searchAssignableStudentsAction(query.trim());
          if (!cancelled) {
            setResults(students);
            setFailed(false);
          }
        } catch {
          if (!cancelled) setFailed(true);
        }
      });
    }, searchDebounceMs);
    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [query]);

  return (
    <div className="grid gap-3">
      <div className="grid gap-1">
        <label htmlFor={searchId} className="text-sm text-muted-foreground">
          Buscar alumno
        </label>
        <input
          id={searchId}
          type="search"
          autoComplete="off"
          value={query}
          placeholder="Nombre del alumno"
          onChange={(event) => setQuery(event.target.value)}
          className={fieldClass}
        />
      </div>

      <div aria-live="polite" className="sr-only">
        {loading
          ? "Buscando alumnos"
          : results
            ? `${results.length} alumnos encontrados`
            : ""}
      </div>

      {failed ? (
        <p role="alert" className="text-sm text-destructive">
          No pudimos buscar alumnos. Revisa tu conexión e inténtalo otra vez.
        </p>
      ) : null}

      {results === null ? (
        <p className="text-sm text-muted-foreground">Cargando alumnos…</p>
      ) : results.length === 0 ? (
        <div className="grid gap-2 rounded-xl border border-dashed border-border p-4 text-sm">
          <p className="font-semibold text-foreground">
            No encontramos alumnos activos
          </p>
          <Link
            href="/dashboard/students/new"
            className="font-semibold text-primary underline-offset-4 hover:underline"
          >
            Registrar un alumno nuevo
          </Link>
        </div>
      ) : (
        <ul aria-label="Alumnos" className="grid gap-2">
          {results.map((student) => (
            <li key={student.id}>
              {student.hasCurrentMembership ? (
                <div className="flex min-h-11 items-center justify-between gap-3 rounded-xl border border-border p-3 opacity-80">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {student.fullName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Ya tiene una membresía vigente
                    </p>
                  </div>
                  <Link
                    href={`/dashboard/students/${student.id}?section=membership`}
                    className="shrink-0 text-xs font-semibold text-primary underline-offset-4 hover:underline"
                  >
                    Ver membresía
                  </Link>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() =>
                    onSelect({ id: student.id, fullName: student.fullName })
                  }
                  className={optionClass}
                >
                  <span className="truncate text-sm font-semibold text-foreground">
                    {student.fullName}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Sin membresía vigente
                  </span>
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function PlanStep({
  plans,
  selectedId,
  onSelect,
  onPlanCreated,
}: {
  plans: AssignablePlan[] | null;
  selectedId: string | null;
  onSelect: (plan: AssignablePlan) => void;
  onPlanCreated: () => void;
}) {
  const [creating, setCreating] = useState(false);

  if (plans === null) {
    return <p className="text-sm text-muted-foreground">Cargando planes…</p>;
  }

  if (creating || plans.length === 0) {
    return (
      <div className="grid gap-3">
        {plans.length === 0 ? (
          <div className="grid gap-1 rounded-xl border border-dashed border-border p-4">
            <p className="text-sm font-semibold text-foreground">
              Aún no tienes planes activos
            </p>
            <p className="text-xs text-muted-foreground">
              Crea uno aquí; mantendremos el alumno seleccionado.
            </p>
          </div>
        ) : (
          <Button type="button" variant="quiet" onClick={() => setCreating(false)}>
            Volver a los planes
          </Button>
        )}
        <PlanForm
          compact
          onSaved={() => {
            setCreating(false);
            onPlanCreated();
          }}
        />
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      <ul aria-label="Planes activos" className="grid gap-2 sm:grid-cols-2">
        {plans.map((plan) => (
          <li key={plan.id} className="min-w-0">
            <button
              type="button"
              aria-pressed={selectedId === plan.id}
              onClick={() => onSelect(plan)}
              className={optionClass}
            >
              <span className="flex items-center justify-between gap-2">
                <span className="truncate text-sm font-semibold text-foreground">
                  {plan.name}
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {billingCycleLabels[plan.billingCycle]}
                </span>
              </span>
              <span className="metric-number text-lg font-bold text-foreground">
                {formatMoney(plan.price, plan.currency)}
                <span className="ml-1 text-xs font-medium text-muted-foreground">
                  / {billingCycleNouns[plan.billingCycle]}
                </span>
              </span>
              {plan.benefits.length > 0 ? (
                <span className="truncate text-xs text-muted-foreground">
                  {plan.benefits.join(" · ")}
                </span>
              ) : null}
            </button>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={() => setCreating(true)}
        className="justify-self-start text-sm font-semibold text-primary underline-offset-4 hover:underline"
      >
        Crear otro plan
      </button>
    </div>
  );
}

function SummaryRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="metric-number text-right font-semibold text-foreground">
        {children}
      </dd>
    </div>
  );
}

function ConfirmStep({
  student,
  plan,
  assignmentToken,
  onChangeStudent,
  onChangePlan,
  onDone,
}: {
  student: AssignStudent;
  plan: AssignablePlan;
  assignmentToken: string;
  onChangeStudent?: () => void;
  onChangePlan: () => void;
  onDone: () => void;
}) {
  const [state, formAction, pending] = useActionState(
    assignMembershipAction,
    initialState,
  );
  const startsOnId = useId();
  const methodId = useId();
  const paidOnId = useId();
  const referenceId = useId();
  const [startsOn, setStartsOn] = useState(() => localIsoDate());
  const [withPayment, setWithPayment] = useState(true);
  const [amount, setAmount] = useState<number | null>(plan.price);
  const [paidOn, setPaidOn] = useState(() => localIsoDate());

  const expiresOn = startsOn ? cycleEnd(startsOn, plan.billingCycle) : null;
  const paid = withPayment ? (amount ?? 0) : 0;
  const balance = Math.max(0, plan.price - paid);
  const locked = pending || state.status === "payment_failed";
  const missingAmount = withPayment && !(amount !== null && amount > 0);

  if (state.status === "assigned" && state.result) {
    return (
      <div className="grid gap-4" role="status">
        <div className="grid gap-2 rounded-xl border border-success/30 bg-success/10 p-4">
          <ToneBadge tone="success">Plan asignado</ToneBadge>
          <p className="text-base font-semibold text-foreground">
            {student.fullName} ya tiene {plan.name}
          </p>
        </div>
        <dl className="grid gap-2 text-sm">
          <SummaryRow label="Vence">
            {formatShortDate(state.result.expiresOn)}
          </SummaryRow>
          <SummaryRow label="Pagado">
            {formatMoney(state.result.paidAmount, state.result.currency)}
          </SummaryRow>
          <SummaryRow label="Saldo pendiente">
            {formatMoney(state.result.balance, state.result.currency)}
          </SummaryRow>
        </dl>
        <div className="grid gap-2 sm:grid-cols-2">
          <Link
            href={`/dashboard/students/${student.id}`}
            onClick={onDone}
            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-border bg-surface-raised px-4 text-sm font-semibold text-foreground transition-colors hover:bg-surface-overlay"
          >
            Ver ficha del alumno
          </Link>
          <Button type="button" variant="primary" onClick={onDone}>
            Listo
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form action={formAction} className="grid gap-4">
      <input type="hidden" name="studentId" value={student.id} />
      <input type="hidden" name="planId" value={plan.id} />
      <input type="hidden" name="assignmentToken" value={assignmentToken} />

      <dl className="grid gap-2 rounded-xl border border-border bg-surface-raised/50 p-3 text-sm">
        <div className="flex items-center justify-between gap-3">
          <dt className="text-muted-foreground">Alumno</dt>
          <dd className="flex min-w-0 items-center gap-2 font-semibold text-foreground">
            <span className="truncate">{student.fullName}</span>
            {onChangeStudent && !locked ? (
              <button
                type="button"
                onClick={onChangeStudent}
                className="min-h-11 shrink-0 px-1 text-xs font-semibold text-primary"
              >
                Cambiar
              </button>
            ) : null}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-muted-foreground">Plan</dt>
          <dd className="flex min-w-0 items-center gap-2 font-semibold text-foreground">
            <span className="truncate">{plan.name}</span>
            {!locked ? (
              <button
                type="button"
                onClick={onChangePlan}
                className="min-h-11 shrink-0 px-1 text-xs font-semibold text-primary"
              >
                Cambiar
              </button>
            ) : null}
          </dd>
        </div>
        <SummaryRow label="Precio pactado">
          {formatMoney(plan.price, plan.currency)} /{" "}
          {billingCycleNouns[plan.billingCycle]}
        </SummaryRow>
      </dl>

      <div className="grid gap-1">
        <label htmlFor={startsOnId} className="text-sm text-muted-foreground">
          Inicio
        </label>
        <input
          id={startsOnId}
          type="date"
          name="startsOn"
          required
          readOnly={locked}
          value={startsOn}
          onChange={(event) => setStartsOn(event.target.value)}
          className={fieldClass}
        />
        {expiresOn ? (
          <p className="text-xs text-muted-foreground">
            Próximo vencimiento: {formatShortDate(expiresOn)}
          </p>
        ) : null}
      </div>

      <label className="flex min-h-11 items-center justify-between gap-3 rounded-xl border border-border p-3">
        <span className="grid gap-0.5">
          <span className="text-sm font-semibold text-foreground">
            Registrar pago inicial
          </span>
          <span className="text-xs text-muted-foreground">
            Si no lo registras, el saldo quedará en cobros pendientes.
          </span>
        </span>
        <input
          type="checkbox"
          role="switch"
          name="withPayment"
          checked={withPayment}
          disabled={locked}
          onChange={(event) => setWithPayment(event.target.checked)}
          className="h-6 w-10 shrink-0 accent-primary"
        />
      </label>
      {locked && withPayment ? (
        <input type="hidden" name="withPayment" value="on" />
      ) : null}

      {withPayment ? (
        <fieldset disabled={pending} className="grid gap-3 sm:grid-cols-2">
          <legend className="sr-only">Pago inicial</legend>
          <MoneyInput
            name="amount"
            label="Monto pagado"
            currency={plan.currency}
            value={amount}
            onChange={setAmount}
            required
          />
          <div className="grid gap-1">
            <label htmlFor={methodId} className="text-sm text-muted-foreground">
              Medio de pago
            </label>
            <select
              id={methodId}
              name="method"
              defaultValue="transfer"
              className={fieldClass}
            >
              <option value="transfer">Transferencia</option>
              <option value="cash">Efectivo</option>
              <option value="card">Tarjeta</option>
              <option value="other">Otro</option>
            </select>
          </div>
          <div className="grid gap-1">
            <label htmlFor={paidOnId} className="text-sm text-muted-foreground">
              Fecha de pago
            </label>
            <input
              id={paidOnId}
              type="date"
              name="paidOn"
              value={paidOn}
              onChange={(event) => setPaidOn(event.target.value)}
              className={fieldClass}
            />
          </div>
          <div className="grid gap-1">
            <label
              htmlFor={referenceId}
              className="text-sm text-muted-foreground"
            >
              Referencia (opcional)
            </label>
            <input
              id={referenceId}
              name="reference"
              maxLength={120}
              placeholder="N° de operación"
              className={fieldClass}
            />
          </div>
        </fieldset>
      ) : null}

      <dl className="grid gap-2 rounded-xl border border-border p-3 text-sm">
        <SummaryRow label="Pago inicial">
          {formatMoney(paid, plan.currency)}
        </SummaryRow>
        <SummaryRow label="Saldo resultante">
          <span className={balance > 0 ? "text-warning" : "text-success"}>
            {formatMoney(balance, plan.currency)}
          </span>
        </SummaryRow>
      </dl>

      {state.status === "error" && state.error ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}

      {state.status === "payment_failed" ? (
        <div
          role="alert"
          className="grid gap-1 rounded-xl border border-warning/40 bg-warning/10 p-3 text-sm text-foreground"
        >
          <p className="font-semibold">{state.error}</p>
          {state.result ? (
            <p className="text-xs text-muted-foreground">
              Saldo pendiente:{" "}
              {formatMoney(state.result.balance, state.result.currency)}
            </p>
          ) : null}
        </div>
      ) : null}

      {state.status === "payment_failed" ? (
        <div className="grid gap-2 sm:grid-cols-2">
          <Button type="button" variant="secondary" onClick={onDone}>
            Dejar pendiente
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={pending}
            disabled={missingAmount}
          >
            Reintentar cobro
          </Button>
        </div>
      ) : (
        <Button
          type="submit"
          variant="primary"
          isLoading={pending}
          disabled={missingAmount}
        >
          {withPayment ? "Asignar y registrar pago" : "Asignar plan"}
        </Button>
      )}
    </form>
  );
}

function AssignMembershipFlow({
  initialStudent,
  initialPlan,
  onDone,
}: {
  initialStudent?: AssignStudent;
  initialPlan?: AssignablePlan;
  onDone: () => void;
}) {
  const [assignmentToken] = useState(() => crypto.randomUUID());
  const [student, setStudent] = useState<AssignStudent | null>(
    initialStudent ?? null,
  );
  const [plan, setPlan] = useState<AssignablePlan | null>(initialPlan ?? null);
  const [plans, setPlans] = useState<AssignablePlan[] | null>(null);
  const [plansFailed, setPlansFailed] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [step, setStep] = useState<Step>(() =>
    !initialStudent ? "student" : !initialPlan ? "plan" : "confirm",
  );

  const steps: Step[] = [
    ...(initialStudent ? [] : (["student"] as const)),
    ...(initialPlan ? [] : (["plan"] as const)),
    "confirm",
  ];
  if (!steps.includes(step)) steps.splice(steps.indexOf("confirm"), 0, step);

  const needsPlans = step === "plan";
  useEffect(() => {
    if (!needsPlans) return;
    let cancelled = false;
    listAssignablePlansAction()
      .then((loaded) => {
        if (!cancelled) {
          setPlans(loaded);
          setPlansFailed(false);
        }
      })
      .catch(() => {
        if (!cancelled) setPlansFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [needsPlans, reloadKey]);

  const headingRef = useRef<HTMLHeadingElement>(null);
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    headingRef.current?.focus();
  }, [step]);

  return (
    <div className="grid gap-4">
      {steps.length > 1 ? <StepIndicator steps={steps} current={step} /> : null}
      <h3
        ref={headingRef}
        tabIndex={-1}
        className="text-base font-semibold text-foreground outline-none"
      >
        {step === "student"
          ? "¿A quién asignas el plan?"
          : step === "plan"
            ? `Elige el plan${student ? ` para ${student.fullName}` : ""}`
            : "Revisa y confirma"}
      </h3>

      {step === "student" ? (
        <StudentStep
          onSelect={(selected) => {
            setStudent(selected);
            setStep(plan ? "confirm" : "plan");
          }}
        />
      ) : null}

      {step === "plan" ? (
        plansFailed ? (
          <div role="alert" className="grid gap-2 text-sm">
            <p className="text-destructive">No pudimos cargar tus planes.</p>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setReloadKey((key) => key + 1)}
            >
              Reintentar
            </Button>
          </div>
        ) : (
          <PlanStep
            plans={plans}
            selectedId={plan?.id ?? null}
            onSelect={(selected) => {
              setPlan(selected);
              setStep("confirm");
            }}
            onPlanCreated={() => {
              setPlans(null);
              setReloadKey((key) => key + 1);
            }}
          />
        )
      ) : null}

      {step === "confirm" && student && plan ? (
        <ConfirmStep
          student={student}
          plan={plan}
          assignmentToken={assignmentToken}
          onChangeStudent={initialStudent ? undefined : () => setStep("student")}
          onChangePlan={() => setStep("plan")}
          onDone={onDone}
        />
      ) : null}
    </div>
  );
}

/** Unified flow to give a student a plan, optionally recording the first payment. */
export function AssignMembershipSheet({
  trigger,
  triggerClassName,
  triggerLabel,
  open: controlledOpen,
  onOpenChange,
  initialStudent,
  initialPlan,
}: {
  trigger?: ReactNode;
  triggerClassName?: string;
  triggerLabel?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  initialStudent?: AssignStudent;
  initialPlan?: AssignablePlan;
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const open = controlledOpen ?? uncontrolledOpen;
  const setOpen = (next: boolean) => {
    if (controlledOpen === undefined) setUncontrolledOpen(next);
    onOpenChange?.(next);
  };

  return (
    <BottomSheet
      title="Asignar plan"
      description={
        initialStudent
          ? `Elige el plan y la forma de pago de ${initialStudent.fullName}.`
          : initialPlan
            ? `Elige al alumno que tomará ${initialPlan.name}.`
            : "Elige alumno, plan y registra el primer pago si corresponde."
      }
      trigger={trigger}
      triggerClassName={triggerClassName}
      triggerLabel={triggerLabel}
      open={open}
      onOpenChange={setOpen}
      variant="side"
    >
      <AssignMembershipFlow
        initialStudent={initialStudent}
        initialPlan={initialPlan}
        onDone={() => setOpen(false)}
      />
    </BottomSheet>
  );
}
