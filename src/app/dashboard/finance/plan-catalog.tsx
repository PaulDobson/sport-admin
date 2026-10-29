"use client";

import { useActionState, useId, useMemo, useState } from "react";
import { LayoutGrid, List, Search } from "lucide-react";
import type { MembershipPlan } from "@/domain/instructor-finance/membership";
import { formatMoney } from "@/lib/format-money";
import { Button, ToneBadge } from "@/presentation/components/primitives";
import { billingCycleLabels } from "./plan-templates";
import { setPlanStatusAction, type PlanFormState } from "./actions";
import { AssignMembershipSheet } from "./assign-membership-sheet";
import { BottomSheet } from "./bottom-sheet";
import { PlanCard } from "./plan-card";
import { PlanForm } from "./plan-form";

const primaryTriggerClass =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-transparent bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90";

const initialState: PlanFormState = { error: null, saved: false };

type ViewMode = "grid" | "table";

const headCell =
  "px-3 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground";

function PlanStatusButton({
  planId,
  archived,
}: {
  planId: string;
  archived: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    setPlanStatusAction,
    initialState,
  );
  return (
    <form action={formAction} className="grid gap-2">
      <input type="hidden" name="planId" value={planId} />
      <input
        type="hidden"
        name="status"
        value={archived ? "active" : "archived"}
      />
      <Button
        type="submit"
        variant={archived ? "secondary" : "danger"}
        isLoading={pending}
      >
        {archived ? "Reactivar plan" : "Archivar plan"}
      </Button>
      {state.error ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}

function PlanActions({
  plan,
  canManage,
  compact = false,
}: {
  plan: MembershipPlan;
  canManage: boolean;
  compact?: boolean;
}) {
  if (!canManage) return null;

  const iconAction =
    "inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-surface-raised hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

  if (compact) {
    return (
      <div className="flex items-center justify-end gap-0.5">
        {plan.status === "active" ? (
          <AssignMembershipSheet
            trigger="Asignar"
            triggerLabel={`Asignar ${plan.name}`}
            triggerClassName={`${iconAction} text-xs font-semibold hover:text-primary`}
            initialPlan={{
              id: plan.id,
              name: plan.name,
              price: plan.price,
              currency: plan.currency,
              billingCycle: plan.billingCycle,
              expirationGraceDays: plan.expirationGraceDays,
              benefits: plan.benefits,
            }}
          />
        ) : null}
        <BottomSheet
          title={`Editar ${plan.name}`}
          trigger="Editar"
          description="Los cambios aplican solo a nuevas membresías."
          variant="side"
          size="wide"
          triggerClassName={`${iconAction} text-xs font-semibold hover:text-primary`}
        >
          <div className="grid gap-4">
            <PlanForm plan={plan} />
            <PlanStatusButton
              planId={plan.id}
              archived={plan.status === "archived"}
            />
          </div>
        </BottomSheet>
      </div>
    );
  }

  return (
    <>
      {plan.status === "active" ? (
        <AssignMembershipSheet
          trigger="Asignar"
          triggerLabel={`Asignar ${plan.name}`}
          triggerClassName={primaryTriggerClass}
          initialPlan={{
            id: plan.id,
            name: plan.name,
            price: plan.price,
            currency: plan.currency,
            billingCycle: plan.billingCycle,
            expirationGraceDays: plan.expirationGraceDays,
            benefits: plan.benefits,
          }}
        />
      ) : null}
      <BottomSheet
        title={`Editar ${plan.name}`}
        trigger="Editar"
        description="Los cambios aplican solo a nuevas membresías."
        variant="side"
        size="wide"
      >
        <div className="grid gap-4">
          <PlanForm plan={plan} />
          <PlanStatusButton
            planId={plan.id}
            archived={plan.status === "archived"}
          />
        </div>
      </BottomSheet>
    </>
  );
}

/** Normalises a string for case-insensitive, accent-insensitive comparison. */
function normalise(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/** Parses a user-typed amount string into a number; returns null if blank/invalid. */
function parseAmount(raw: string): number | null {
  const cleaned = raw.replace(/[^0-9.]/g, "");
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export function PlanCatalog({
  plans,
  showArchived,
  canManage,
  monthlyRevenueByPlan,
}: {
  plans: MembershipPlan[];
  showArchived: boolean;
  canManage: boolean;
  /** Monthly equivalent of agreed prices of current memberships, by plan id. */
  monthlyRevenueByPlan?: Record<string, number>;
}) {
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [nameQuery, setNameQuery] = useState("");
  const [amountQuery, setAmountQuery] = useState("");
  const nameInputId = useId();
  const amountInputId = useId();

  const filteredPlans = useMemo(() => {
    const name = normalise(nameQuery.trim());
    const amount = parseAmount(amountQuery);
    return plans.filter((plan) => {
      if (name && !normalise(plan.name).includes(name)) return false;
      if (amount !== null && plan.price !== amount) return false;
      return true;
    });
  }, [plans, nameQuery, amountQuery]);

  const hasFilters = nameQuery.trim() !== "" || amountQuery.trim() !== "";
  const noResults = filteredPlans.length === 0;

  return (
    <section aria-labelledby="plan-catalog-heading" className="grid gap-4">
      <h2 id="plan-catalog-heading" className="sr-only">
        {showArchived ? "Planes archivados" : "Planes activos"}
      </h2>
      {/* ── Toolbar: search + view toggle + "Nuevo plan" ── */}
      <div className="rounded-xl border border-border bg-card p-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Name search */}
          <label className="relative min-w-0 flex-1 basis-56">
            <span className="sr-only">Buscar por nombre</span>
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            />
            <input
              id={nameInputId}
              type="search"
              value={nameQuery}
              onChange={(e) => setNameQuery(e.target.value)}
              placeholder="Buscar por nombre…"
              className="h-10 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary"
            />
          </label>

          {/* Amount filter */}
          <label className="relative min-w-0 flex-1 basis-44">
            <span className="sr-only">Filtrar por monto</span>
            <input
              id={amountInputId}
              type="text"
              inputMode="numeric"
              value={amountQuery}
              onChange={(e) => setAmountQuery(e.target.value)}
              placeholder="Filtrar por monto…"
              className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary"
            />
          </label>

          {/* View mode toggle */}
          <div
            role="group"
            aria-label="Vista"
            className="flex h-10 items-center gap-0.5 rounded-lg border border-border bg-background p-0.5"
          >
            <button
              type="button"
              aria-pressed={viewMode === "grid"}
              aria-label="Vista en cuadrícula"
              onClick={() => setViewMode("grid")}
              className="inline-flex h-full w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground aria-pressed:bg-surface-raised aria-pressed:text-foreground"
            >
              <LayoutGrid className="h-4 w-4" aria-hidden />
            </button>
            <button
              type="button"
              aria-pressed={viewMode === "table"}
              aria-label="Vista en tabla"
              onClick={() => setViewMode("table")}
              className="inline-flex h-full w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground aria-pressed:bg-surface-raised aria-pressed:text-foreground"
            >
              <List className="h-4 w-4" aria-hidden />
            </button>
          </div>

          {/* New plan button */}
          {canManage && !showArchived ? (
            <div className="ml-auto">
              <BottomSheet
                title="Nuevo plan"
                description="Elige una plantilla o define precio, ciclo y beneficios."
                trigger={
                  <>
                    <span aria-hidden="true">+</span>
                    Nuevo plan
                  </>
                }
                triggerClassName="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                variant="side"
                size="wide"
              >
                <PlanForm />
              </BottomSheet>
            </div>
          ) : null}
        </div>
      </div>

      {/* ── Content ── */}
      {plans.length === 0 ? (
        <div className="grid justify-items-center gap-3 rounded-xl border border-border bg-card px-4 py-12 text-center">
          <h3 className="text-lg font-semibold">
            {showArchived ? "Sin planes archivados" : "Aún no hay planes"}
          </h3>
          <p className="max-w-sm text-sm text-muted-foreground">
            {showArchived
              ? "Los planes que archives quedarán disponibles aquí."
              : "Crea tu primer plan para poder asignar membresías."}
          </p>
        </div>
      ) : noResults && hasFilters ? (
        <div className="grid justify-items-center gap-3 rounded-xl border border-border bg-card px-4 py-12 text-center">
          <h3 className="text-lg font-semibold">Sin resultados</h3>
          <p className="max-w-sm text-sm text-muted-foreground">
            No hay planes que coincidan con los filtros aplicados.
          </p>
        </div>
      ) : viewMode === "grid" ? (
        /* ── Grid view ── */
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filteredPlans.map((plan) => (
            <li key={plan.id} className="min-w-0">
              <PlanCard
                plan={plan}
                monthlyRevenue={monthlyRevenueByPlan?.[plan.id]}
                actions={<PlanActions plan={plan} canManage={canManage} />}
              />
            </li>
          ))}
        </ul>
      ) : (
        /* ── Table view ── */
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          {/* Mobile: card list */}
          <ul
            aria-label={showArchived ? "Planes archivados" : "Planes activos"}
            className="divide-y divide-border md:hidden"
          >
            {filteredPlans.map((plan) => (
              <li key={plan.id} className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground">{plan.name}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {billingCycleLabels[plan.billingCycle]}
                    </p>
                  </div>
                  {plan.status === "archived" ? (
                    <ToneBadge>Archivado</ToneBadge>
                  ) : (
                    <ToneBadge tone="success">Activo</ToneBadge>
                  )}
                </div>
                <dl className="grid grid-cols-2 gap-2">
                  <div>
                    <dt className="text-xs text-muted-foreground">Precio</dt>
                    <dd className="metric-number font-semibold text-foreground">
                      {formatMoney(plan.price, plan.currency)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">
                      Alumnos vigentes
                    </dt>
                    <dd className="metric-number font-semibold text-foreground">
                      {plan.membershipCount ?? 0}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">
                      Ingreso mensual
                    </dt>
                    <dd className="metric-number font-semibold text-foreground">
                      {formatMoney(
                        monthlyRevenueByPlan?.[plan.id] ?? 0,
                        plan.currency,
                      )}
                    </dd>
                  </div>
                </dl>
                {canManage ? (
                  <div className="flex flex-wrap gap-2">
                    <PlanActions plan={plan} canManage={canManage} />
                  </div>
                ) : null}
              </li>
            ))}
          </ul>

          {/* Desktop: table */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">
                {showArchived ? "Planes archivados" : "Planes activos"}
              </caption>
              <thead className="border-b border-border">
                <tr>
                  <th scope="col" className={`${headCell} pl-5`}>
                    Plan
                  </th>
                  <th scope="col" className={`${headCell} text-right`}>
                    Precio
                  </th>
                  <th scope="col" className={`${headCell} text-right`}>
                    Alumnos
                  </th>
                  <th scope="col" className={`${headCell} text-right`}>
                    Ingreso mensual
                  </th>
                  <th scope="col" className={headCell}>
                    Estado
                  </th>
                  {canManage ? (
                    <th scope="col" className={`${headCell} pr-5 text-right`}>
                      Acciones
                    </th>
                  ) : null}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredPlans.map((plan) => (
                  <tr
                    key={plan.id}
                    className="transition-colors hover:bg-surface-raised/40"
                  >
                    <td className="py-2.5 pl-5 pr-3">
                      <p className="font-semibold text-foreground">
                        {plan.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {billingCycleLabels[plan.billingCycle]}
                      </p>
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <span className="metric-number whitespace-nowrap font-semibold text-foreground">
                        {formatMoney(plan.price, plan.currency)}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <span className="metric-number text-foreground">
                        {plan.membershipCount ?? 0}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <span className="metric-number whitespace-nowrap text-foreground">
                        {formatMoney(
                          monthlyRevenueByPlan?.[plan.id] ?? 0,
                          plan.currency,
                        )}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      {plan.status === "archived" ? (
                        <ToneBadge>Archivado</ToneBadge>
                      ) : (
                        <ToneBadge tone="success">Activo</ToneBadge>
                      )}
                    </td>
                    {canManage ? (
                      <td className="py-2.5 pl-3 pr-4">
                        <PlanActions
                          plan={plan}
                          canManage={canManage}
                          compact
                        />
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
