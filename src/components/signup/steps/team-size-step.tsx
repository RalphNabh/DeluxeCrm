"use client";

import { OptionCards } from "@/components/signup/option-cards";
import { TEAM_SIZE_OPTIONS } from "@/lib/signup-onboarding";
import type { SignupWizardDraft, TeamSize } from "@/lib/signup-onboarding";

type TeamSizeStepProps = {
  draft: SignupWizardDraft;
  onChange: (patch: Partial<SignupWizardDraft>) => void;
};

export function TeamSizeStep({ draft, onChange }: TeamSizeStepProps) {
  return (
    <OptionCards<TeamSize>
      options={TEAM_SIZE_OPTIONS}
      value={draft.team_size}
      onChange={(team_size) => onChange({ team_size })}
    />
  );
}
