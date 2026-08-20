"use client";

import { SIGNUP_STEP_COUNT } from "@/lib/signup-onboarding";

type SignupProgressProps = {
  currentStep: number;
};

export function SignupProgress({ currentStep }: SignupProgressProps) {
  const pct = Math.round((currentStep / SIGNUP_STEP_COUNT) * 100);

  return (
    <div className="w-full space-y-2" aria-live="polite">
      <div className="flex items-center justify-between text-sm font-medium">
        <span className="text-[var(--mkt-mist)]">
          Step {currentStep} of {SIGNUP_STEP_COUNT}
        </span>
        <span className="text-[var(--mkt-ink)]">{pct}%</span>
      </div>
      <div
        className="h-2 w-full overflow-hidden rounded-full bg-[var(--mkt-paper-deep)]"
        role="progressbar"
        aria-valuenow={currentStep}
        aria-valuemin={1}
        aria-valuemax={SIGNUP_STEP_COUNT}
        aria-label={`Signup progress: step ${currentStep} of ${SIGNUP_STEP_COUNT}`}
      >
        <div
          className="h-full rounded-full bg-[var(--mkt-signal)] transition-all duration-300 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
