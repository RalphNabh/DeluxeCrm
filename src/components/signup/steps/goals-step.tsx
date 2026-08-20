"use client";

import { OptionCards } from "@/components/signup/option-cards";
import { PRIMARY_GOAL_OPTIONS } from "@/lib/signup-onboarding";
import type { PrimaryGoal, SignupWizardDraft } from "@/lib/signup-onboarding";

type GoalsStepProps = {
  draft: SignupWizardDraft;
  onChange: (patch: Partial<SignupWizardDraft>) => void;
};

export function GoalsStep({ draft, onChange }: GoalsStepProps) {
  return (
    <div className="space-y-3">
      <OptionCards<PrimaryGoal>
        multi
        options={PRIMARY_GOAL_OPTIONS}
        selected={draft.primary_goals}
        onMultiChange={(primary_goals) => {
          if (primary_goals.length <= 5) {
            onChange({ primary_goals });
          }
        }}
        columns={1}
      />
      {draft.primary_goals.length >= 5 ? (
        <p className="text-sm text-[var(--mkt-mist)]">Maximum 5 goals selected.</p>
      ) : null}
    </div>
  );
}
