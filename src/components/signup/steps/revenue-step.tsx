"use client";

import { OptionCards } from "@/components/signup/option-cards";
import { REVENUE_OPTIONS } from "@/lib/signup-onboarding";
import type { EstimatedRevenue, SignupWizardDraft } from "@/lib/signup-onboarding";

type RevenueStepProps = {
  draft: SignupWizardDraft;
  onChange: (patch: Partial<SignupWizardDraft>) => void;
};

export function RevenueStep({ draft, onChange }: RevenueStepProps) {
  return (
    <div className="space-y-4">
      <OptionCards<EstimatedRevenue>
        options={REVENUE_OPTIONS}
        value={draft.estimated_revenue}
        onChange={(estimated_revenue) => onChange({ estimated_revenue })}
        columns={1}
      />
      <p className="text-sm text-[var(--mkt-mist)] text-center">
        This helps us recommend the right plan - you can skip with &ldquo;Prefer not to say&rdquo;.
      </p>
    </div>
  );
}
