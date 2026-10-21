"use client";

import { memo, useCallback } from "react";
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

/**
 * Arrow chip thumbnail — usa directamente ArrowStimulusSVG a tamaño fijo.
 * El SVG es 48×48px en el chip, pero escala hasta 70vw en la proyección.
 */
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

/**
 * Sound chip thumbnail — nota musical SVG.
 * El label del estímulo es el identificador principal (se muestra debajo).
 */
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
      className={`flex flex-col items-center gap-2 rounded-2xl border px-4 py-3.5 transition-all duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed ${
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

      {/* Label — más grande y legible */}
      <span
        className={`text-xs font-bold uppercase leading-none tracking-[0.08em] transition-colors ${
          selected ? "text-foreground" : "text-muted-foreground"
        }`}
      >
        {stimulus.label}
      </span>
    </button>
  );
});

// ─── Category row ─────────────────────────────────────────────────────────────

const CategoryRow = memo(function CategoryRow({
  label,
  pillCls,
  chipAccentOn,
  stimuli,
  selectedIds,
  disabled,
  onToggle,
  onToggleAll,
}: {
  label: string;
  pillCls: string;
  chipAccentOn: string;
  stimuli: Stimulus[];
  selectedIds: Set<string>;
  disabled: boolean;
  onToggle: (id: string) => void;
  onToggleAll: (ids: string[], allSelected: boolean) => void;
}) {
  const selectedCount = stimuli.filter((s) => selectedIds.has(s.id)).length;
  const allSelected = selectedCount === stimuli.length;

  const handleToggleAll = useCallback(() => {
    onToggleAll(
      stimuli.map((s) => s.id),
      allSelected,
    );
  }, [stimuli, allSelected, onToggleAll]);

  return (
    <div className="space-y-3">
      {/* Header — pill y botón "Todos" más grandes */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span
            className={`rounded-full border px-3.5 py-1 text-xs font-black uppercase tracking-[0.14em] ${pillCls}`}
          >
            {label}
          </span>
          <span className="text-sm font-semibold text-muted-foreground">
            {selectedCount} / {stimuli.length}
          </span>
        </div>
        <button
          type="button"
          disabled={disabled}
          onClick={handleToggleAll}
          aria-label={
            allSelected
              ? `Quitar todos los ${label}`
              : `Seleccionar todos los ${label}`
          }
          className="rounded-xl border border-border bg-surface-raised px-4 py-2 text-sm font-bold text-muted-foreground transition-colors hover:bg-surface-overlay hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
        >
          {allSelected ? "Quitar todos" : "Todos"}
        </button>
      </div>

      {/* Chips — más grandes y con más separación */}
      <div
        role="group"
        aria-label={`Estímulos de ${label}`}
        className="flex flex-wrap gap-6"
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
  );
});

// ─── Category style map ───────────────────────────────────────────────────────

const CATEGORY_STYLES: Record<
  string,
  { pillCls: string; chipAccentOn: string }
> = {
  color: {
    pillCls: "border-violet-500/30 bg-violet-500/10 text-violet-400",
    chipAccentOn: "border-violet-500/40 bg-violet-500/10",
  },
  letter: {
    pillCls: "border-sky-500/30 bg-sky-500/10 text-sky-400",
    chipAccentOn: "border-sky-500/40 bg-sky-500/10",
  },
  number: {
    pillCls: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
    chipAccentOn: "border-emerald-500/40 bg-emerald-500/10",
  },
  arrow: {
    pillCls: "border-orange-500/30 bg-orange-500/10 text-orange-400",
    chipAccentOn: "border-orange-500/40 bg-orange-500/10",
  },
  sound: {
    pillCls: "border-pink-500/30 bg-pink-500/10 text-pink-400",
    chipAccentOn: "border-pink-500/40 bg-pink-500/10",
  },
};

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
  const selectedSet = new Set(selectedIds);

  const handleToggle = useCallback(
    (id: string) => {
      const next = new Set(selectedIds);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      onChange(Array.from(next));
    },
    [selectedIds, onChange],
  );

  const handleToggleAll = useCallback(
    (ids: string[], allSelected: boolean) => {
      if (allSelected) {
        onChange(selectedIds.filter((id) => !ids.includes(id)));
      } else {
        onChange(Array.from(new Set([...selectedIds, ...ids])));
      }
    },
    [selectedIds, onChange],
  );

  return (
    <div className="space-y-6">
      {STIMULUS_CATEGORIES.map((cat, i) => {
        const styles = CATEGORY_STYLES[cat.id] ?? {
          pillCls: "border-border bg-surface-raised text-muted-foreground",
          chipAccentOn: "border-primary/40 bg-primary/10",
        };
        return (
          <div key={cat.id}>
            {i > 0 && <div className="mb-6 h-px bg-border" />}
            <CategoryRow
              label={cat.label}
              pillCls={styles.pillCls}
              chipAccentOn={styles.chipAccentOn}
              stimuli={cat.stimuli}
              selectedIds={selectedSet}
              disabled={disabled}
              onToggle={handleToggle}
              onToggleAll={handleToggleAll}
            />
          </div>
        );
      })}

      {selectedIds.length === 0 && (
        <p
          role="alert"
          className="rounded-xl border border-warning/30 bg-warning/8 px-4 py-3 text-sm font-semibold text-warning"
        >
          Selecciona al menos un estímulo para poder iniciar.
        </p>
      )}
    </div>
  );
}
