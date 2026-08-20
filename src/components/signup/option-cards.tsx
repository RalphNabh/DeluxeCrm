"use client";

import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

type SingleOptionCardsProps<T extends string> = {
  options: { value: T; label: string; hint?: string }[];
  value: T | "";
  onChange: (value: T) => void;
  multi?: false;
  columns?: 1 | 2;
};

type MultiOptionCardsProps<T extends string> = {
  options: { value: T; label: string; hint?: string }[];
  selected: T[];
  onMultiChange: (values: T[]) => void;
  multi: true;
  columns?: 1 | 2;
};

type OptionCardsProps<T extends string> =
  | SingleOptionCardsProps<T>
  | MultiOptionCardsProps<T>;

export function OptionCards<T extends string>(props: OptionCardsProps<T>) {
  if (props.multi) {
    const { options, selected, onMultiChange, columns = 2 } = props;
    return (
      <div
        className={cn(
          "grid gap-3",
          columns === 2 ? "sm:grid-cols-2" : "grid-cols-1",
        )}
        role="group"
      >
        {options.map((opt) => {
          const isSelected = selected.includes(opt.value);
          return (
            <button
              key={opt.value}
              type="button"
              aria-pressed={isSelected}
              onClick={() => {
                if (isSelected) {
                  onMultiChange(selected.filter((v) => v !== opt.value));
                } else {
                  onMultiChange([...selected, opt.value]);
                }
              }}
              className={cn(
                "relative flex items-start gap-3 rounded-xl border-2 p-4 text-left transition-all",
                "hover:border-[var(--mkt-signal)] hover:bg-[var(--mkt-paper)]",
                isSelected
                  ? "border-[var(--mkt-signal)] bg-[var(--mkt-paper)] shadow-sm"
                  : "border-[var(--mkt-paper-deep)] bg-white",
              )}
            >
              <span
                className={cn(
                  "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-colors",
                  isSelected
                    ? "border-[var(--mkt-signal)] bg-[var(--mkt-signal)] text-[var(--mkt-cta-text)]"
                    : "border-[var(--mkt-paper-deep)] bg-white",
                )}
              >
                {isSelected ? <Check className="h-3 w-3" strokeWidth={3} /> : null}
              </span>
              <span>
                <span className="block font-semibold text-[var(--mkt-ink)]">
                  {opt.label}
                </span>
                {opt.hint ? (
                  <span className="mt-0.5 block text-sm text-[var(--mkt-mist)]">
                    {opt.hint}
                  </span>
                ) : null}
              </span>
            </button>
          );
        })}
      </div>
    );
  }

  const { options, value, onChange, columns = 2 } = props;

  return (
    <div
      className={cn(
        "grid gap-3",
        columns === 2 ? "sm:grid-cols-2" : "grid-cols-1",
      )}
      role="radiogroup"
    >
      {options.map((opt) => {
        const isSelected = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={isSelected}
            onClick={() => onChange(opt.value)}
            className={cn(
              "flex flex-col rounded-xl border-2 p-4 text-left transition-all",
              "hover:border-[var(--mkt-signal)] hover:bg-[var(--mkt-paper)]",
              isSelected
                ? "border-[var(--mkt-signal)] bg-[var(--mkt-paper)] shadow-sm ring-1 ring-[var(--mkt-signal)]"
                : "border-[var(--mkt-paper-deep)] bg-white",
            )}
          >
            <span className="font-semibold text-[var(--mkt-ink)]">{opt.label}</span>
            {opt.hint ? (
              <span className="mt-1 text-sm text-[var(--mkt-mist)]">{opt.hint}</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
