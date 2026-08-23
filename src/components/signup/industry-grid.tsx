"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { INDUSTRIES } from "@/lib/signup-onboarding";
import { cn } from "@/lib/utils";

type IndustryGridProps = {
  value: string;
  onChange: (value: string) => void;
};

export function IndustryGrid({ value, onChange }: IndustryGridProps) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return INDUSTRIES;
    return INDUSTRIES.filter((ind) => ind.toLowerCase().includes(q));
  }, [query]);

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--mkt-mist)]" />
        <Input
          type="search"
          placeholder="Search industries…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9"
          aria-label="Search industries"
        />
      </div>
      <div
        className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[320px] overflow-y-auto pr-1"
        role="radiogroup"
        aria-label="Industry"
      >
        {filtered.map((industry) => {
          const selected = value === industry;
          return (
            <button
              key={industry}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(industry)}
              className={cn(
                "rounded-lg border-2 px-3 py-2.5 text-sm font-medium text-left transition-all",
                "hover:border-[var(--mkt-signal)] hover:bg-[var(--mkt-paper)]",
                selected
                  ? "border-[var(--mkt-signal)] bg-[var(--mkt-paper)] text-[var(--mkt-ink)]"
                  : "border-[var(--mkt-paper-deep)] bg-white text-[var(--mkt-ink)]",
              )}
            >
              {industry}
            </button>
          );
        })}
      </div>
      {filtered.length === 0 ? (
        <p className="text-sm text-[var(--mkt-mist)] text-center py-4">
          No matches - try &quot;Other&quot;
        </p>
      ) : null}
    </div>
  );
}
