"use client";

import Link from "next/link";
import { CalendarRange } from "lucide-react";
import { BottomSheet } from "@/presentation/components/bottom-sheet";
import { financeHref } from "./finance-href";

const inputClass =
  "h-11 rounded-lg border border-input bg-background px-3 text-sm text-foreground";
const submitClass =
  "inline-flex min-h-11 items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90";
const clearClass =
  "inline-flex min-h-11 items-center justify-center rounded-lg border border-border px-4 text-sm font-semibold text-muted-foreground transition-colors hover:bg-surface-raised hover:text-foreground";

interface CollectionDateFilterProps {
  from?: string;
  to?: string;
  status?: string;
}

function DateFields({
  from,
  to,
  status,
  idPrefix,
  layout,
}: CollectionDateFilterProps & {
  idPrefix: string;
  layout: "inline" | "stacked";
}) {
  const hasRange = Boolean(from || to);
  return (
    <form
      method="get"
      action="/dashboard/finance"
      aria-label="Filtrar por fecha de cobro"
      className={
        layout === "inline"
          ? "flex flex-wrap items-end gap-3"
          : "grid gap-4"
      }
    >
      <input type="hidden" name="section" value="collections" />
      {status ? <input type="hidden" name="status" value={status} /> : null}
      <label
        htmlFor={`${idPrefix}-from`}
        className="flex flex-col gap-1 text-xs font-semibold text-muted-foreground"
      >
        Cobro desde
        <input
          id={`${idPrefix}-from`}
          className={inputClass}
          type="date"
          name="from"
          defaultValue={from}
        />
      </label>
      <label
        htmlFor={`${idPrefix}-to`}
        className="flex flex-col gap-1 text-xs font-semibold text-muted-foreground"
      >
        Cobro hasta
        <input
          id={`${idPrefix}-to`}
          className={inputClass}
          type="date"
          name="to"
          defaultValue={to}
        />
      </label>
      <div className="flex gap-2">
        <button type="submit" className={submitClass}>
          Aplicar fechas
        </button>
        {hasRange ? (
          <Link
            href={financeHref({ section: "collections", status })}
            className={clearClass}
          >
            Quitar fechas
          </Link>
        ) : null}
      </div>
    </form>
  );
}

/** Date range for the collections list: inline on desktop, a bottom sheet on mobile. */
export function CollectionDateFilter(props: CollectionDateFilterProps) {
  const hasRange = Boolean(props.from || props.to);
  return (
    <>
      <div className="hidden sm:block">
        <DateFields {...props} idPrefix="collections-inline" layout="inline" />
      </div>
      <div className="sm:hidden">
        <BottomSheet
          title="Fechas de cobro"
          description="Muestra solo los cobros que vencen en este rango."
          triggerLabel={hasRange ? "Fechas (filtro activo)" : "Fechas"}
          triggerClassName="inline-flex min-h-11 items-center gap-2 rounded-full border border-border px-4 text-sm font-semibold text-muted-foreground transition-colors hover:bg-surface-raised hover:text-foreground"
          trigger={
            <>
              <CalendarRange className="size-4" aria-hidden />
              Fechas
              {hasRange ? (
                <span
                  aria-hidden="true"
                  className="size-2 rounded-full bg-primary"
                />
              ) : null}
            </>
          }
        >
          <DateFields {...props} idPrefix="collections-sheet" layout="stacked" />
        </BottomSheet>
      </div>
    </>
  );
}
