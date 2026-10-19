"use client";

// Adapted from FullCalendar's shadcn registry (@fullcalendar/monarch-event-calendar, MIT)
// for read-only month (tiles) and week/day (time grid) session views.
// Colors use rings, backgrounds and inset shadows instead of border colors because the
// global `* { border-color }` rule is unlayered and overrides Tailwind border-color utilities.
import FullCalendar, {
  type CalendarOptions,
  type DayCellInfo,
  type DayHeaderInfo,
} from "@fullcalendar/react";
import "@fullcalendar/react/skeleton.css";
import { cn } from "@/lib/utils";

const xxsTextClass = "text-[0.6875rem]/[1.090909]";
const focusClass = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

function dayKey(date: Date) {
  // FullCalendar emits UTC-coerced dates when a named time zone is set.
  return date.toISOString().slice(0, 10);
}

export type EventCalendarViewsProps = Omit<CalendarOptions, "views"> & {
  /** Highlights a day (YYYY-MM-DD) as the current selection. */
  selectedDate?: string;
};

export function EventCalendarViews({ selectedDate, ...options }: EventCalendarViewsProps) {
  const isSelected = (date: Date) => selectedDate !== undefined && dayKey(date) === selectedDate;

  return (
    <FullCalendar
      /* Events
      ----------------------------------------------------------------------------------------- */
      eventShortHeight={44}
      eventColor="var(--primary)"
      eventContrastColor="var(--primary-foreground)"
      eventClass={`cursor-pointer ${focusClass}`}
      blockEventClass="group relative overflow-hidden"
      blockEventInnerClass="text-foreground"
      blockEventTimeClass="whitespace-nowrap overflow-hidden"
      blockEventTitleClass="whitespace-nowrap overflow-hidden"
      listItemEventClass="items-center"
      listItemEventInnerClass="flex flex-row items-center"
      columnEventTitleSticky={false}

      /* More-link & popover
      ----------------------------------------------------------------------------------------- */
      moreLinkClass={focusClass}
      moreLinkInnerClass="whitespace-nowrap overflow-hidden"
      popoverFormat={{ day: "numeric", weekday: "long", month: "long" }}
      popoverClass="m-1 min-w-64 overflow-hidden rounded-xl bg-popover text-popover-foreground shadow-xl shadow-black/40 ring-1 ring-border"
      popoverCloseClass={`group absolute end-2 top-2 size-8 items-center justify-center rounded-full hover:bg-foreground/10 ${focusClass}`}

      /* Misc
      ----------------------------------------------------------------------------------------- */
      navLinkClass={focusClass}
      highlightClass="bg-primary/10"
      nonBusinessHoursClass="bg-foreground/3"
      nowIndicatorLineClass="-m-px border-1 border-destructive bg-destructive"
      nowIndicatorDotClass="-m-[5px] size-2.5 rounded-full bg-destructive ring-2 ring-card"
      fillerClass="opacity-50"
      tableHeaderClass="bg-card"

      views={{
        /* Month: tile grid
        --------------------------------------------------------------------------------------- */
        dayGrid: {
          dayHeaderAlign: "center",
          dayHeaderClass: "justify-center pb-2",
          dayHeaderContent: (info: DayHeaderInfo) => (
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {info.text}
            </span>
          ),
          dayCellClass: (info: DayCellInfo) =>
            info.inPopover
              ? ""
              : cn(
                  "isolate relative cursor-pointer p-1.5",
                  "before:pointer-events-none before:absolute before:inset-1 before:-z-10 before:rounded-xl before:ring-1 before:ring-inset before:transition-colors",
                  info.isOther
                    ? "opacity-45 before:bg-transparent before:ring-border/40"
                    : isSelected(info.date)
                      ? "before:bg-primary/10 before:ring-2 before:ring-primary"
                      : "before:bg-surface-raised/45 before:ring-border/70 hover:before:bg-surface-raised hover:before:ring-primary/40",
                ),
          dayCellInnerClass: (info: DayCellInfo) => cn(info.inPopover && "p-2"),
          dayCellTopClass: "flex flex-row justify-center pt-1",
          dayCellTopInnerClass: (info: DayCellInfo) =>
            cn(
              "flex h-7 min-w-7 items-center justify-center rounded-full px-1.5 text-sm font-bold tabular-nums transition-colors",
              info.isToday
                ? "bg-primary text-primary-foreground"
                : info.hasNavLink && "hover:bg-foreground/10",
              info.isOther && "font-semibold text-muted-foreground",
            ),
          dayCellBottomClass: "min-h-2",
          listItemEventClass: "mx-1.5 mb-0.5 rounded-md px-1 hover:bg-foreground/8",
          listItemEventBeforeClass: "size-2 shrink-0 rounded-full bg-(--fc-event-color)",
          listItemEventInnerClass: "min-w-0 py-0.5 text-xs",
          listItemEventTimeClass: "ps-1.5 font-mono text-[0.6875rem] tabular-nums text-muted-foreground whitespace-nowrap",
          listItemEventTitleClass: "min-w-0 truncate px-1 font-semibold",
          rowMoreLinkClass: "mx-1.5 rounded-md hover:bg-primary/10",
          rowMoreLinkInnerClass: "px-1.5 py-0.5 text-xs font-semibold text-primary",
        },

        /* Week & day: time grid
        --------------------------------------------------------------------------------------- */
        timeGrid: {
          dayHeaderAlign: "center",
          dayHeaderClass: (info: DayHeaderInfo) =>
            cn("justify-center border-b", isSelected(info.date) && !info.inPopover && "bg-primary/5"),
          dayHeaderInnerClass: "group mx-2 my-2 flex flex-col items-center outline-none",
          dayHeaderContent: (info: DayHeaderInfo) => (
            <>
              {info.weekdayText ? (
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {info.weekdayText}
                </span>
              ) : null}
              {info.dayNumberText ? (
                <span
                  className={cn(
                    "mt-0.5 flex size-8 items-center justify-center rounded-full text-base font-bold tabular-nums transition-colors",
                    info.isToday
                      ? "bg-primary text-primary-foreground"
                      : info.hasNavLink && "group-hover:bg-foreground/10",
                  )}
                >
                  {info.dayNumberText}
                </span>
              ) : null}
            </>
          ),
          dayLaneClass: (info) =>
            cn("border", info.isDisabled && "bg-foreground/3", isSelected(info.date) && "bg-primary/5"),
          dayLaneInnerClass: (info) => (info.isStack ? "m-1" : info.isNarrow ? "mx-px" : "ms-0.5 me-1.5"),
          slotLaneClass: (info) => cn("border", info.isMinor && "border-dotted"),
          slotHeaderClass: (info) => cn("w-2 self-end justify-end border", info.isMinor && "border-dotted"),
          slotHeaderInnerClass: (info) =>
            cn(
              "relative ms-2 me-3 my-2 font-mono tabular-nums text-muted-foreground",
              info.isNarrow ? `-top-4 ${xxsTextClass}` : "-top-5 text-xs",
              info.isFirst && "hidden",
            ),
          slotHeaderDividerClass: "border-e",
          columnEventClass: (info) =>
            cn(
              "mb-px rounded-md ring-1 ring-card",
              "bg-[color-mix(in_oklab,var(--fc-event-color)_20%,var(--card))] shadow-[inset_3px_0_0_var(--fc-event-color)]",
              "hover:bg-[color-mix(in_oklab,var(--fc-event-color)_30%,var(--card))]",
              info.isSelected && "ring-2 ring-primary",
            ),
          columnEventInnerClass: "h-full",
          columnMoreLinkClass: "mb-px rounded-md bg-surface-raised ring-1 ring-card hover:bg-surface-overlay",
          columnMoreLinkInnerClass: (info) => (info.isNarrow ? `p-0.5 ${xxsTextClass}` : "p-1 text-xs"),
        },
      }}

      {...options}
    />
  );
}
