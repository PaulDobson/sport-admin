"use client";

import { memo, useCallback, useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { STIMULUS_CATEGORIES } from "./stimulus-data";
import { ArrowStimulusSVG, SoundStimulusSVG } from "./stimulus-svg";
import type {
  ArrowStimulus,
  ColorStimulus,
  LetterStimulus,
  NumberStimulus,
  SoundStimulus,
  Stimulus,
} from "@/domain/cognitive-training/cognitive-exercise";

// ─── Chip visuals ─────────────────────────────────────────────────────────────

function ColorChipContent({ stimulus }: { stimulus: ColorStimulus }) {
  return (
    <div
      className="h-12 w-12 rounded-full shadow-md"
      style={{ backgroundColor: stimulus.hex }}
    />
  );
}

function LetterChipContent({
  stimulus,
  selected,
}: {
  stimulus: LetterStimulus;
  selected: boolean;
}) {
  return (
    <span
      className={`font-mono text-4xl font-black leading-none transition-colors ${
        selected ? "text-sky-400" : "text-muted-foreground/35"
      }`}
    >
      {stimulus.glyph}
    </span>
  );
}

function NumberChipContent({
  stimulus,
  selected,
}: {
  stimulus: NumberStimulus;
  selected: boolean;
}) {
  return (
    <span
      className={`font-mono text-4xl font-black leading-none transition-colors ${
        selected ? "text-emerald-400" : "text-muted-foreground/35"
      }`}
    >
      {stimulus.glyph}
    </span>
  );
}

function ArrowChipContent({
  stimulus,
  selected,
}: {
  stimulus: ArrowStimulus;
  selected: boolean;
}) {
  return (
    <ArrowStimulusSVG
      stimulus={stimulus}
      className="h-12 w-12 transition-opacity"
      color={selected ? "#fb923c" : "rgba(156,163,175,0.35)"}
    />
  );
}

function SoundChipContent({
  stimulus,
  selected,
}: {
  stimulus: SoundStimulus;
  selected: boolean;
}) {
  return (
    <SoundStimulusSVG
      stimulus={stimulus}
      className="h-12 w-12 transition-opacity"
      color={selected ? "#f472b6" : "rgba(156,163,175,0.35)"}
    />
  );
}

// ─── Individual chip ──────────────────────────────────────────────────────────

const StimulusChip = memo(function StimulusChip({
  stimulus,
  selected,
  disabled,
  accentOn,
  onToggle,
}: {
  stimulus: Stimulus;
  selected: boolean;
  disabled: boolean;
  accentOn: string;
  onToggle: (id: string) => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-label={`${selected ? "Quitar" : "Añadir"} ${stimulus.label}`}
      disabled={disabled}
      onClick={() => onToggle(stimulus.id)}
      className={`flex flex-col items-center gap-2 rounded-xl border px-4 py-4 transition-all duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed ${
        selected
          ? `${accentOn} opacity-100`
          : "border-border bg-surface-raised/40 opacity-55 hover:opacity-75"
      }`}
    >
      {stimulus.kind === "color" && <ColorChipContent stimulus={stimulus} />}
      {stimulus.kind === "letter" && (
        <LetterChipContent stimulus={stimulus} selected={selected} />
      )}
      {stimulus.kind === "number" && (
        <NumberChipContent stimulus={stimulus} selected={selected} />
      )}
      {stimulus.kind === "arrow" && (
        <ArrowChipContent stimulus={stimulus} selected={selected} />
      )}
      {stimulus.kind === "sound" && (
        <SoundChipContent stimulus={stimulus} selected={selected} />
      )}
      <span
        className={`text-sm font-bold uppercase leading-none tracking-[0.06em] transition-colors ${
          selected ? "text-foreground" : "text-muted-foreground"
        }`}
      >
        {stimulus.label}
      </span>
    </button>
  );
});

// ─── Category styles ──────────────────────────────────────────────────────────

const CATEGORY_STYLES: Record<
  string,
  {
    pillCls: string;
    chipAccentOn: string;
    headerBg: string;
    countBg: string;
    chevronColor: string;
  }
> = {
  color: {
    pillCls: "border-violet-500/30 bg-violet-500/10 text-violet-400",
    chipAccentOn: "border-violet-500/40 bg-violet-500/10",
    headerBg: "bg-violet-500/[0.06] hover:bg-violet-500/[0.1]",
    countBg: "bg-violet-500/15 text-violet-400",
    chevronColor: "text-violet-400",
  },
  letter: {
    pillCls: "border-sky-500/30 bg-sky-500/10 text-sky-400",
    chipAccentOn: "border-sky-500/40 bg-sky-500/10",
    headerBg: "bg-sky-500/[0.06] hover:bg-sky-500/[0.1]",
    countBg: "bg-sky-500/15 text-sky-400",
    chevronColor: "text-sky-400",
  },
  number: {
    pillCls: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
    chipAccentOn: "border-emerald-500/40 bg-emerald-500/10",
    headerBg: "bg-emerald-500/[0.06] hover:bg-emerald-500/[0.1]",
    countBg: "bg-emerald-500/15 text-emerald-400",
    chevronColor: "text-emerald-400",
  },
  arrow: {
    pillCls: "border-orange-500/30 bg-orange-500/10 text-orange-400",
    chipAccentOn: "border-orange-500/40 bg-orange-500/10",
    headerBg: "bg-orange-500/[0.06] hover:bg-orange-500/[0.1]",
    countBg: "bg-orange-500/15 text-orange-400",
    chevronColor: "text-orange-400",
  },
  sound: {
    pillCls: "border-pink-500/30 bg-pink-500/10 text-pink-400",
    chipAccentOn: "border-pink-500/40 bg-pink-500/10",
    headerBg: "bg-pink-500/[0.06] hover:bg-pink-500/[0.1]",
    countBg: "bg-pink-500/15 text-pink-400",
    chevronColor: "text-pink-400",
  },
};

// ─── Collapsible category panel ───────────────────────────────────────────────

const CollapsibleCategory = memo(function CollapsibleCategory({
  categoryId,
  label,
  pillCls,
  chipAccentOn,
  headerBg,
  countBg,
  chevronColor,
  stimuli,
  selectedIds,
  disabled,
  defaultOpen,
  onToggle,
  onToggleAll,
}: {
  categoryId: string;
  label: string;
  pillCls: string;
  chipAccentOn: string;
  headerBg: string;
  countBg: string;
  chevronColor: string;
  stimuli: Stimulus[];
  selectedIds: Set<string>;
  disabled: boolean;
  defaultOpen: boolean;
  onToggle: (id: string) => void;
  onToggleAll: (ids: string[], allSelected: boolean) => void;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const selectedCount = stimuli.filter((s) => selectedIds.has(s.id)).length;
  const allSelected = selectedCount === stimuli.length && stimuli.length > 0;

  const handleToggleAll = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onToggleAll(
        stimuli.map((s) => s.id),
        allSelected,
      );
    },
    [stimuli, allSelected, onToggleAll],
  );

  const panelId = `stimulus-panel-${categoryId}`;
  const headerId = `stimulus-header-${categoryId}`;

  return (
    <div className="overflow-hidden rounded-2xl border border-border">
      {/* ── Collapsible header ───────────────────────────────────────────── */}
      <div
        className={`flex w-full items-center gap-3 px-5 py-4 transition-colors ${headerBg} ${disabled ? "cursor-not-allowed" : ""}`}
      >
        {/* Clickable area: pill + badge + spacer + chevron */}
        <button
          id={headerId}
          type="button"
          aria-expanded={isOpen}
          aria-controls={panelId}
          disabled={disabled}
          onClick={() => setIsOpen((v) => !v)}
          className="flex flex-1 items-center gap-3 text-left focus-visible:outline-none"
        >
          {/* Category pill */}
          <span
            className={`shrink-0 rounded-full border px-4 py-1 text-sm font-black uppercase tracking-[0.1em] ${pillCls}`}
          >
            {label}
          </span>

          {/* Selection count badge */}
          {selectedCount > 0 && (
            <span
              className={`shrink-0 rounded-full px-3 py-0.5 text-sm font-bold ${countBg}`}
            >
              {selectedCount}/{stimuli.length}
            </span>
          )}
          {selectedCount === 0 && (
            <span className="text-sm text-muted-foreground/50">
              {stimuli.length} disponibles
            </span>
          )}

          {/* Spacer */}
          <span className="flex-1" />

          {/* Chevron */}
          <ChevronDown
            aria-hidden="true"
            className={`h-5 w-5 shrink-0 transition-transform duration-200 ${chevronColor} ${isOpen ? "rotate-180" : ""}`}
          />
        </button>

        {/* Select all button — lives outside the toggle button */}
        {isOpen && (
          <button
            type="button"
            disabled={disabled}
            onClick={handleToggleAll}
            aria-label={
              allSelected
                ? `Quitar todos los ${label}`
                : `Seleccionar todos los ${label}`
            }
            className="ml-2 shrink-0 rounded-lg border border-border bg-card/60 px-4 py-2 text-sm font-bold text-muted-foreground transition-colors hover:bg-surface-raised hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
          >
            {allSelected ? "Quitar todos" : "Todos"}
          </button>
        )}
      </div>

      {/* ── Collapsible body ─────────────────────────────────────────────── */}
      <div
        id={panelId}
        role="region"
        aria-labelledby={headerId}
        hidden={!isOpen}
        className={`border-t border-border/60 px-5 pb-5 pt-4 transition-all ${isOpen ? "block" : "hidden"}`}
      >
        <div
          role="group"
          aria-label={`Estímulos de ${label}`}
          className="flex flex-wrap gap-4"
        >
          {stimuli.map((stimulus) => (
            <StimulusChip
              key={stimulus.id}
              stimulus={stimulus}
              selected={selectedIds.has(stimulus.id)}
              disabled={disabled}
              accentOn={chipAccentOn}
              onToggle={onToggle}
            />
          ))}
        </div>
      </div>
    </div>
  );
});

// ─── Main export ──────────────────────────────────────────────────────────────

export interface StimulusSelectorProps {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
}

export function StimulusSelector({
  selectedIds,
  onChange,
  disabled = false,
}: StimulusSelectorProps) {
  // Memoize the Set so CollapsibleCategory's memo can do a stable reference
  // comparison. Without this, a new Set is created on every render — including
  // every 100 ms tick during an exercise — which breaks memo for all 5
  // category panels and their chip children.
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const handleToggle = useCallback(
    (id: string) => {
      // Build the next Set from the memoized selectedSet to avoid iterating
      // selectedIds array twice. Both are O(N) but this avoids an extra
      // Array→Set conversion.
      const next = new Set(selectedSet);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      onChange(Array.from(next));
    },
    [selectedSet, onChange],
  );

  const handleToggleAll = useCallback(
    (ids: string[], allSelected: boolean) => {
      if (allSelected) {
        // Use a Set for the ids-to-remove lookup → O(N) instead of O(N×M)
        const removeSet = new Set(ids);
        onChange(selectedIds.filter((id) => !removeSet.has(id)));
      } else {
        onChange(Array.from(new Set([...selectedIds, ...ids])));
      }
    },
    [selectedIds, onChange],
  );

  return (
    <div className="space-y-2">
      {STIMULUS_CATEGORIES.map((cat, i) => {
        const styles = CATEGORY_STYLES[cat.id] ?? {
          pillCls: "border-border bg-surface-raised text-muted-foreground",
          chipAccentOn: "border-primary/40 bg-primary/10",
          headerBg: "bg-surface-raised/60 hover:bg-surface-raised",
          countBg: "bg-primary/15 text-primary",
          chevronColor: "text-muted-foreground",
        };
        return (
          <CollapsibleCategory
            key={cat.id}
            categoryId={cat.id}
            label={cat.label}
            pillCls={styles.pillCls}
            chipAccentOn={styles.chipAccentOn}
            headerBg={styles.headerBg}
            countBg={styles.countBg}
            chevronColor={styles.chevronColor}
            stimuli={cat.stimuli}
            selectedIds={selectedSet}
            disabled={disabled}
            defaultOpen={i === 0}
            onToggle={handleToggle}
            onToggleAll={handleToggleAll}
          />
        );
      })}

      {selectedIds.length === 0 && (
        <p
          role="alert"
          className="rounded-xl border border-warning/30 bg-warning/8 px-4 py-3.5 text-base font-semibold text-warning"
        >
          Selecciona al menos un estímulo para poder iniciar.
        </p>
      )}
    </div>
  );
}
