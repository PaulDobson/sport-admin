"use client";

import { useId, useState, type KeyboardEvent } from "react";
import { X } from "lucide-react";

function classes(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export interface SegmentedOption<Value extends string> {
  value: Value;
  label: string;
}

/** Native radio group: submits with the form and supports arrow-key navigation. */
export function SegmentedControl<Value extends string>({
  name,
  legend,
  options,
  value,
  defaultValue,
  onChange,
  hint,
}: {
  name: string;
  legend: string;
  options: SegmentedOption<Value>[];
  value?: Value;
  defaultValue?: Value;
  onChange?: (value: Value) => void;
  hint?: string;
}) {
  const hintId = useId();
  return (
    <fieldset aria-describedby={hint ? hintId : undefined} className="min-w-0">
      <legend className="mb-1 text-sm text-muted-foreground">{legend}</legend>
      <div className="grid auto-cols-fr grid-flow-col gap-1 rounded-xl border border-input bg-background/50 p-1">
        {options.map((option) => (
          <label key={option.value} className="min-w-0">
            <input
              type="radio"
              name={name}
              value={option.value}
              className="peer sr-only"
              {...(value !== undefined
                ? { checked: value === option.value }
                : { defaultChecked: defaultValue === option.value })}
              onChange={() => onChange?.(option.value)}
            />
            <span className="flex min-h-10 cursor-pointer items-center justify-center truncate rounded-lg px-2 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground peer-checked:bg-primary peer-checked:text-primary-foreground peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary sm:text-sm">
              {option.label}
            </span>
          </label>
        ))}
      </div>
      {hint ? (
        <p id={hintId} className="mt-1 text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </fieldset>
  );
}

/** Editable tag list serialised as newline-separated values in a hidden input. */
export function ChipInput({
  name,
  label,
  values,
  defaultValues = [],
  onChange,
  placeholder,
  maxLength = 80,
}: {
  name: string;
  label: string;
  values?: string[];
  defaultValues?: string[];
  onChange?: (values: string[]) => void;
  placeholder?: string;
  maxLength?: number;
}) {
  const inputId = useId();
  const [internal, setInternal] = useState(defaultValues);
  const [draft, setDraft] = useState("");
  const current = values ?? internal;

  const update = (next: string[]) => {
    if (values === undefined) setInternal(next);
    onChange?.(next);
  };
  const add = () => {
    const value = draft.trim();
    if (!value) return;
    if (!current.some((item) => item.toLowerCase() === value.toLowerCase())) {
      update([...current, value]);
    }
    setDraft("");
  };
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      add();
    } else if (event.key === "Backspace" && !draft && current.length > 0) {
      update(current.slice(0, -1));
    }
  };

  return (
    <div className="grid min-w-0 gap-1">
      <label htmlFor={inputId} className="text-sm text-muted-foreground">
        {label}
      </label>
      <input type="hidden" name={name} value={current.join("\n")} />
      {current.length > 0 ? (
        <ul aria-label={`${label} agregados`} className="flex flex-wrap gap-2">
          {current.map((item) => (
            <li
              key={item}
              className="inline-flex max-w-full items-center gap-1 rounded-full border border-primary/25 bg-primary/10 py-1 pl-3 pr-1 text-xs font-semibold text-primary"
            >
              <span className="truncate">{item}</span>
              <button
                type="button"
                aria-label={`Quitar ${item}`}
                onClick={() => update(current.filter((value) => value !== item))}
                className="grid h-6 w-6 shrink-0 place-items-center rounded-full hover:bg-primary/15 focus-visible:outline-2 focus-visible:outline-primary"
              >
                <X aria-hidden="true" className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="flex gap-2">
        <input
          id={inputId}
          value={draft}
          maxLength={maxLength}
          placeholder={placeholder}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={onKeyDown}
          className="h-11 min-w-0 flex-1 rounded-lg border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground"
        />
        <button
          type="button"
          onClick={add}
          disabled={!draft.trim()}
          className="inline-flex min-h-11 shrink-0 items-center rounded-lg border border-border bg-surface-raised px-3 text-sm font-semibold text-foreground transition-colors hover:bg-surface-overlay disabled:opacity-45"
        >
          Agregar
        </button>
      </div>
    </div>
  );
}

export function currencyFractionDigits(currency: string) {
  try {
    return (
      new Intl.NumberFormat("es-CL", { style: "currency", currency })
        .resolvedOptions().maximumFractionDigits ?? 0
    );
  } catch {
    return 0;
  }
}

export function parseMoneyInput(raw: string, currency: string) {
  const decimals = currencyFractionDigits(currency);
  const cleaned =
    decimals === 0
      ? raw.replace(/\D/g, "")
      : raw.replace(/\./g, "").replace(",", ".").replace(/[^\d.]/g, "");
  if (!cleaned) return null;
  const parsed = Number(cleaned);
  if (!Number.isFinite(parsed)) return null;
  const factor = 10 ** decimals;
  return Math.round(parsed * factor) / factor;
}

export function formatMoneyInput(value: number | null, currency: string) {
  if (value === null) return "";
  return new Intl.NumberFormat("es-CL", {
    minimumFractionDigits: 0,
    maximumFractionDigits: currencyFractionDigits(currency),
  }).format(value);
}

/** Shows a formatted amount while submitting the raw number through a hidden input. */
export function MoneyInput({
  name,
  label,
  currency,
  value,
  defaultValue,
  onChange,
  required,
  error,
}: {
  name: string;
  label: string;
  currency: string;
  value?: number | null;
  defaultValue?: number | null;
  onChange?: (value: number | null) => void;
  required?: boolean;
  error?: string | null;
}) {
  const inputId = useId();
  const errorId = useId();
  const [internal, setInternal] = useState<number | null>(defaultValue ?? null);
  const current = value === undefined ? internal : value;
  const [text, setText] = useState(formatMoneyInput(current, currency));
  const [lastCurrent, setLastCurrent] = useState(current);
  const [lastCurrency, setLastCurrency] = useState(currency);

  if (current !== lastCurrent || currency !== lastCurrency) {
    setLastCurrent(current);
    setLastCurrency(currency);
    if (parseMoneyInput(text, currency) !== current || currency !== lastCurrency) {
      setText(formatMoneyInput(current, currency));
    }
  }

  return (
    <div className="grid min-w-0 gap-1">
      <label htmlFor={inputId} className="text-sm text-muted-foreground">
        {label}
      </label>
      <div
        className={classes(
          "flex h-11 items-center rounded-lg border bg-background focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ring",
          error ? "border-destructive" : "border-input",
        )}
      >
        <span className="metric-number pl-3 text-xs font-semibold text-muted-foreground">
          {currency}
        </span>
        <input
          id={inputId}
          inputMode={currencyFractionDigits(currency) === 0 ? "numeric" : "decimal"}
          autoComplete="off"
          required={required}
          value={text}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          onChange={(event) => {
            const parsed = parseMoneyInput(event.target.value, currency);
            const keepsDecimalSeparator = /,\d*$/.test(event.target.value);
            setText(
              keepsDecimalSeparator && currencyFractionDigits(currency) > 0
                ? event.target.value.replace(/[^\d.,]/g, "")
                : formatMoneyInput(parsed, currency),
            );
            setLastCurrent(parsed);
            if (value === undefined) setInternal(parsed);
            onChange?.(parsed);
          }}
          className="metric-number h-full min-w-0 flex-1 bg-transparent px-2 text-base text-foreground outline-none"
        />
      </div>
      <input type="hidden" name={name} value={current ?? ""} />
      {error ? (
        <p id={errorId} className="text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
