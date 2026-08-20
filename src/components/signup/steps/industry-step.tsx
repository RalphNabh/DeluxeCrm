"use client";

import { IndustryGrid } from "@/components/signup/industry-grid";
import type { SignupWizardDraft } from "@/lib/signup-onboarding";

type IndustryStepProps = {
  draft: SignupWizardDraft;
  onChange: (patch: Partial<SignupWizardDraft>) => void;
};

export function IndustryStep({ draft, onChange }: IndustryStepProps) {
  return (
    <IndustryGrid
      value={draft.business_type}
      onChange={(business_type) => onChange({ business_type })}
    />
  );
}
