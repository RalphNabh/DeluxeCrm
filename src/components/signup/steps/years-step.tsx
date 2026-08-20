"use client";

import { OptionCards } from "@/components/signup/option-cards";
import { YEARS_IN_BUSINESS_OPTIONS } from "@/lib/signup-onboarding";
import type { SignupWizardDraft, YearsInBusiness } from "@/lib/signup-onboarding";

type YearsStepProps = {
  draft: SignupWizardDraft;
  onChange: (patch: Partial<SignupWizardDraft>) => void;
};

export function YearsStep({ draft, onChange }: YearsStepProps) {
  return (
    <OptionCards<YearsInBusiness>
      options={YEARS_IN_BUSINESS_OPTIONS}
      value={draft.years_in_business}
      onChange={(years_in_business) => onChange({ years_in_business })}
      columns={1}
    />
  );
}
