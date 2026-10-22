import { listPendingCollections } from "@/application/instructor-finance/use-cases/list-pending-collections";
import { createInstructorFinanceDeps } from "@/infrastructure/composition/instructor-finance-composition";
import { requireOperationalMembership } from "@/app/_lib/operational-context";
import { CollectionDateFilter } from "../collection-date-filter";
import { CollectionList } from "../collection-list";
import { AssignPlanFromUrl } from "../assign-plan-from-url";
import { LinkTabs } from "../link-tabs";
import { Suspense } from "react";
import Link from "next/link";
import { CreditCard } from "lucide-react";

const collectionStatuses = [
  { id: "active", label: "Al día" },
  { id: "past_due", label: "En mora" },
  { id: "expired", label: "Vencidas" },
] as const;

type CollectionStatus = (typeof collectionStatuses)[number]["id"];

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function validDate(value?: string) {
  return value && DATE_PATTERN.test(value) ? value : undefined;
}

function collectionsHref(overrides: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(overrides)) {
    if (v) params.set(k, v);
  }
  const q = params.toString();
  return q ? `/dashboard/finance/collections?${q}` : "/dashboard/finance/collections";
}

interface CollectionsPageProps {
  searchParams: Promise<{
    from?: string;
    to?: string;
    status?: string;
  }>;
}

export default async function CollectionsPage({
  searchParams,
}: CollectionsPageProps) {
  const membership = await requireOperationalMembership();
  const params = await searchParams;
  const today = new Date().toISOString().slice(0, 10);
  const status = collectionStatuses.find((item) => item.id === params.status)
    ?.id as CollectionStatus | undefined;
  const from = validDate(params.from);
  const to = validDate(params.to);
  const canManage = membership.role !== "assistant";

  const finance = await createInstructorFinanceDeps();
  const collections = await listPendingCollections(
    { tenantId: membership.tenantId, onDate: today, from, to },
    finance,
  );

  const visibleCollections = status
    ? collections.filter((item) => item.status === status)
    : collections;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Cobros</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Membresías con saldo pendiente ordenadas por urgencia.
          </p>
        </div>
        {canManage ? (
          <Link
            href={`/dashboard/finance/collections?assign=1`}
            scroll={false}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <CreditCard className="size-4" aria-hidden />
            Asignar plan
          </Link>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <LinkTabs
          label="Estado de los cobros"
          compact
          tabs={[
            {
              id: "all",
              label: "Todos",
              href: collectionsHref({ from, to }),
              active: !status,
              count: collections.length,
            },
            ...collectionStatuses.map((item) => ({
              id: item.id,
              label: item.label,
              href: collectionsHref({ status: item.id, from, to }),
              active: status === item.id,
              count: collections.filter(
                (collection) => collection.status === item.id,
              ).length,
            })),
          ]}
        />
        <CollectionDateFilter from={from} to={to} status={status} action="/dashboard/finance/collections" />
      </div>

      <section aria-labelledby="collections-heading">
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h2 id="collections-heading" className="text-xl font-semibold">
            {status
              ? (collectionStatuses.find((s) => s.id === status)?.label ?? "Cobros")
              : "Todos los cobros"}
          </h2>
          <span className="text-sm text-muted-foreground">
            {visibleCollections.length} pendientes
          </span>
        </div>
        <CollectionList
          items={visibleCollections}
          today={today}
          canManage={canManage}
        />
      </section>

      {canManage ? (
        <Suspense fallback={null}>
          <AssignPlanFromUrl />
        </Suspense>
      ) : null}
    </div>
  );
}
