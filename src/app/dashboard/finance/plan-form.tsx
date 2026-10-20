"use client";

import {
  useActionState,
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
} from "react";
import type {
  BillingCycle,
  MembershipPlan,
} from "@/domain/instructor-finance/membership";
import { monthlyEquivalent } from "@/domain/instructor-finance/dashboard";
import { formatMoney } from "@/lib/format-money";
import {
  ChipInput,
  MoneyInput,
  SegmentedControl,
} from "@/presentation/components/form-controls";
import { Button } from "@/presentation/components/primitives";
import {
  createPlanAction,
  updatePlanAction,
  type PlanFormState,
} from "./actions";
import { PlanCard } from "./plan-card";
import {
  billingCycleLabels,
  gracePresets,
  planTemplates,
  supportedCurrencies,
  type PlanTemplate,
} from "./plan-templates";

const initialState: PlanFormState = { error: null, saved: false };

const fieldClass =
  "h-11 w-full rounded-lg border bg-background px-3 text-foreground";

const cycleOptions = (Object.keys(billingCycleLabels) as BillingCycle[]).map(
  (cycle) => ({ value: cycle, label: billingCycleLabels[cycle] }),
);

interface FieldErrors {
  name?: string;
  price?: string;
}

function TemplatePicker({
  selected,
  onSelect,
}: {
  selected: string | null;
  onSelect: (template: PlanTemplate) => void;
}) {
  return (
    <ul
      aria-label="Plantillas de plan"
      className="-mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-1 sm:grid sm:grid-cols-2 sm:overflow-visible"
    >
      {planTemplates.map((template) => (
        <li key={template.id} className="min-w-[11rem] snap-start sm:min-w-0">
          <button
            type="button"
            aria-pressed={selected === template.id}
            onClick={() => onSelect(template)}
            className="grid min-h-11 w-full gap-0.5 rounded-xl border border-border bg-surface-raised/60 p-3 text-left transition-colors hover:border-primary/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary aria-pressed:border-primary aria-pressed:bg-primary/10"
          >
            <span className="text-sm font-semibold text-foreground">
              {template.label}
            </span>
            <span className="text-xs text-muted-foreground">
              {template.description}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

export function PlanForm({
  plan,
  onSaved,
  compact = false,
}: {
  plan?: MembershipPlan;
  /** Single column without the live preview, for narrow panels. */
  compact?: boolean;
  /** Called after the server confirms the plan was saved. */
  onSaved?: () => void;
}) {
  const [state, formAction, pending] = useActionState(
    plan ? updatePlanAction : createPlanAction,
    initialState,
  );
  const onSavedRef = useRef(onSaved);
  useEffect(() => {
    onSavedRef.current = onSaved;
  });
  useEffect(() => {
    if (state.saved) onSavedRef.current?.();
  }, [state]);
  const membershipCount = plan?.membershipCount ?? 0;
  const nameId = useId();
  const nameErrorId = useId();
  const graceId = useId();
  const graceHintId = useId();
  const currencyId = useId();
  const nameRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const [name, setName] = useState(plan?.name ?? "");
  const [price, setPrice] = useState<number | null>(plan?.price ?? null);
  const [currency, setCurrency] = useState(plan?.currency ?? "CLP");
  const [billingCycle, setBillingCycle] = useState<BillingCycle>(
    plan?.billingCycle ?? "monthly",
  );
  const [graceDays, setGraceDays] = useState(plan?.expirationGraceDays ?? 5);
  const [benefits, setBenefits] = useState<string[]>(plan?.benefits ?? []);
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});

  const currencies = supportedCurrencies.includes(
    currency as (typeof supportedCurrencies)[number],
  )
    ? supportedCurrencies
    : [...supportedCurrencies, currency];

  const applyTemplate = (template: PlanTemplate) => {
    const usesTemplateName =
      !name.trim() || planTemplates.some((item) => item.name === name);
    if (usesTemplateName) setName(template.name);
    if (price === null) setPrice(template.suggestedPrice);
    setBillingCycle(template.billingCycle);
    setGraceDays(template.expirationGraceDays);
    setBenefits(template.benefits);
    setTemplateId(template.id);
    setErrors({});
  };

  const validate = (): FieldErrors => {
    const next: FieldErrors = {};
    if (!name.trim()) next.name = "Ingresa un nombre para el plan.";
    if (price === null) next.price = "Ingresa el precio del plan.";
    else if (price < 0) next.price = "El precio no puede ser negativo.";
    return next;
  };

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    const next = validate();
    setErrors(next);
    if (next.name || next.price) {
      event.preventDefault();
      if (next.name) nameRef.current?.focus();
      else
        formRef.current
          ?.querySelector<HTMLInputElement>('[aria-invalid="true"]')
          ?.focus();
    }
  };

  const monthly =
    price !== null && price >= 0
      ? monthlyEquivalent(price, billingCycle)
      : null;

  return (
    <form
      ref={formRef}
      action={formAction}
      onSubmit={onSubmit}
      noValidate
      className={
        compact
          ? "grid gap-5"
          : "grid gap-5 lg:grid-cols-[minmax(0,1fr)_17rem] lg:items-start"
      }
    >
      {plan ? <input type="hidden" name="planId" value={plan.id} /> : null}

      <div className="grid min-w-0 gap-5">
        {plan && membershipCount > 0 ? (
          <p
            role="note"
            className="rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm text-foreground"
          >
            {membershipCount === 1
              ? "1 membresía vigente conserva su precio y condiciones pactadas."
              : `${membershipCount} membresías vigentes conservan su precio y condiciones pactadas.`}{" "}
            El cambio aplica solo a nuevas altas.
          </p>
        ) : null}

        {plan ? (
          <details className="rounded-xl border border-border p-3">
            <summary className="cursor-pointer text-sm font-semibold text-foreground">
              Usar una plantilla
            </summary>
            <div className="mt-3">
              <TemplatePicker selected={templateId} onSelect={applyTemplate} />
            </div>
          </details>
        ) : (
          <div className="grid gap-2">
            <p className="text-sm font-semibold text-foreground">
              Parte desde una plantilla
            </p>
            <TemplatePicker selected={templateId} onSelect={applyTemplate} />
            <p className="text-xs text-muted-foreground">
              Puedes ajustar todos los valores después.
            </p>
          </div>
        )}

        <div className="grid gap-1">
          <label htmlFor={nameId} className="text-sm text-muted-foreground">
            Nombre
          </label>
          <input
            ref={nameRef}
            id={nameId}
            name="name"
            value={name}
            maxLength={80}
            placeholder="Ej. Plan mensual"
            aria-invalid={errors.name ? true : undefined}
            aria-describedby={errors.name ? nameErrorId : undefined}
            onChange={(event) => {
              setName(event.target.value);
              if (errors.name)
                setErrors((current) => ({ ...current, name: undefined }));
            }}
            className={`${fieldClass} ${errors.name ? "border-destructive" : "border-input"}`}
          />
          {errors.name ? (
            <p id={nameErrorId} className="text-xs text-destructive">
              {errors.name}
            </p>
          ) : null}
        </div>

        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_7rem]">
          <MoneyInput
            name="price"
            label="Precio"
            currency={currency}
            value={price}
            error={errors.price}
            onChange={(value) => {
              setPrice(value);
              if (errors.price)
                setErrors((current) => ({ ...current, price: undefined }));
            }}
          />
          <div className="grid gap-1">
            <label
              htmlFor={currencyId}
              className="text-sm text-muted-foreground"
            >
              Moneda
            </label>
            <select
              id={currencyId}
              name="currency"
              value={currency}
              onChange={(event) => setCurrency(event.target.value)}
              className={`${fieldClass} border-input`}
            >
              {currencies.map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </select>
          </div>
        </div>

        <SegmentedControl
          name="billingCycle"
          legend="Ciclo de cobro"
          options={cycleOptions}
          value={billingCycle}
          onChange={setBillingCycle}
          hint={
            monthly === null
              ? "Elige cada cuánto cobras este plan."
              : billingCycle === "monthly"
                ? `Cobras ${formatMoney(monthly, currency)} cada mes.`
                : `Equivale a ${formatMoney(monthly, currency)} al mes.`
          }
        />

        <div className="grid gap-2">
          <label htmlFor={graceId} className="text-sm text-muted-foreground">
            Días de tolerancia
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <input
              id={graceId}
              name="expirationGraceDays"
              type="number"
              inputMode="numeric"
              min={0}
              max={365}
              value={graceDays}
              aria-describedby={graceHintId}
              onChange={(event) =>
                setGraceDays(
                  Math.max(0, Math.min(365, Number(event.target.value) || 0)),
                )
              }
              className={`${fieldClass} metric-number w-24 border-input`}
            />
            <div
              role="group"
              aria-label="Valores sugeridos de tolerancia"
              className="flex flex-wrap gap-1"
            >
              {gracePresets.map((days) => (
                <button
                  key={days}
                  type="button"
                  aria-pressed={graceDays === days}
                  onClick={() => setGraceDays(days)}
                  className="min-h-11 min-w-11 rounded-lg border border-border px-3 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary aria-pressed:border-primary aria-pressed:bg-primary/10 aria-pressed:text-primary"
                >
                  {days}
                </button>
              ))}
            </div>
          </div>
          <p id={graceHintId} className="text-xs text-muted-foreground">
            {graceDays === 0
              ? "Sin tolerancia: el saldo pasa a mora el día siguiente al vencimiento."
              : `El alumno tiene ${graceDays} ${graceDays === 1 ? "día" : "días"} después del vencimiento para pagar antes de quedar en mora.`}
          </p>
        </div>

        <ChipInput
          name="benefits"
          label="Beneficios"
          values={benefits}
          onChange={setBenefits}
          placeholder="Ej. 3 clases por semana"
        />

        {state.error ? (
          <p role="alert" className="text-sm text-destructive">
            {state.error}
          </p>
        ) : null}
        {state.saved ? (
          <p role="status" className="text-sm text-success">
            {plan ? "Plan actualizado." : "Plan creado."}
          </p>
        ) : null}
      </div>

      {compact ? null : (
        <aside
          aria-label="Vista previa"
          className="grid gap-2 lg:sticky lg:top-0"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Así se verá en tu catálogo
          </p>
          <PlanCard
            preview
            plan={{
              name,
              price,
              currency,
              billingCycle,
              expirationGraceDays: graceDays,
              benefits,
              status: plan?.status ?? "active",
            }}
          />
        </aside>
      )}

      <Button
        type="submit"
        variant="primary"
        isLoading={pending}
        className={compact ? undefined : "lg:col-span-2"}
      >
        {plan ? "Guardar cambios" : "Crear plan"}
      </Button>
    </form>
  );
}
