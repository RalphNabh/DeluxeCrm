"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { SignupWizardDraft } from "@/lib/signup-onboarding";

type CompanyStepProps = {
  draft: SignupWizardDraft;
  onChange: (patch: Partial<SignupWizardDraft>) => void;
};

export function CompanyStep({ draft, onChange }: CompanyStepProps) {
  return (
    <div>
      <Label htmlFor="company_name">Company name</Label>
      <Input
        id="company_name"
        autoComplete="organization"
        value={draft.company_name}
        onChange={(e) => onChange({ company_name: e.target.value })}
        className="mt-1.5"
        placeholder="Your business name"
      />
    </div>
  );
}
