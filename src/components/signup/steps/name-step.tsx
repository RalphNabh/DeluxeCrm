"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { SignupWizardDraft } from "@/lib/signup-onboarding";

type NameStepProps = {
  draft: SignupWizardDraft;
  onChange: (patch: Partial<SignupWizardDraft>) => void;
};

export function NameStep({ draft, onChange }: NameStepProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div>
        <Label htmlFor="first_name">First name</Label>
        <Input
          id="first_name"
          autoComplete="given-name"
          value={draft.first_name}
          onChange={(e) => onChange({ first_name: e.target.value })}
          className="mt-1.5"
        />
      </div>
      <div>
        <Label htmlFor="last_name">Last name</Label>
        <Input
          id="last_name"
          autoComplete="family-name"
          value={draft.last_name}
          onChange={(e) => onChange({ last_name: e.target.value })}
          className="mt-1.5"
        />
      </div>
    </div>
  );
}
