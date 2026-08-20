"use client";

import { PhoneInput } from "@/components/ui/phone-input";
import { Label } from "@/components/ui/label";
import type { SignupWizardDraft } from "@/lib/signup-onboarding";

type PhoneStepProps = {
  draft: SignupWizardDraft;
  onChange: (patch: Partial<SignupWizardDraft>) => void;
};

export function PhoneStep({ draft, onChange }: PhoneStepProps) {
  return (
    <div>
      <Label htmlFor="phone">Phone number</Label>
      <PhoneInput
        id="phone"
        value={draft.phone}
        onChange={(v) => onChange({ phone: v })}
        className="mt-1.5"
      />
      <p className="mt-2 text-sm text-[var(--mkt-mist)]">
        You can skip this for now and add it later in Settings.
      </p>
    </div>
  );
}
