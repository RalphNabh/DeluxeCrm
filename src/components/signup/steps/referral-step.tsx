"use client";

import { OptionCards } from "@/components/signup/option-cards";
import { REFERRAL_SOURCE_OPTIONS } from "@/lib/signup-onboarding";
import type { ReferralSource, SignupWizardDraft } from "@/lib/signup-onboarding";

type ReferralStepProps = {
  draft: SignupWizardDraft;
  onChange: (patch: Partial<SignupWizardDraft>) => void;
};

export function ReferralStep({ draft, onChange }: ReferralStepProps) {
  return (
    <OptionCards<ReferralSource>
      options={REFERRAL_SOURCE_OPTIONS}
      value={draft.referral_source}
      onChange={(referral_source) => onChange({ referral_source })}
      columns={1}
    />
  );
}
