"use client";

import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SignupOAuthButtons } from "@/components/signup/signup-oauth-buttons";
import type { SignupWizardDraft } from "@/lib/signup-onboarding";

type CredentialsStepProps = {
  draft: SignupWizardDraft;
  onChange: (patch: Partial<SignupWizardDraft>) => void;
  oauthMode: boolean;
  onError: (msg: string) => void;
};

export function CredentialsStep({
  draft,
  onChange,
  oauthMode,
  onError,
}: CredentialsStepProps) {
  if (oauthMode) {
    return (
      <p className="text-[var(--mkt-mist)]">
        You&apos;re signed in with your provider. Continue to finish setting up
        your account.
      </p>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <Label htmlFor="signup-email">Work email</Label>
        <Input
          id="signup-email"
          type="email"
          autoComplete="email"
          value={draft.email}
          onChange={(e) => onChange({ email: e.target.value })}
          className="mt-1.5"
          placeholder="you@company.com"
        />
      </div>

      <div>
        <Label htmlFor="signup-password">Password</Label>
        <Input
          id="signup-password"
          type="password"
          autoComplete="new-password"
          value={draft.password}
          onChange={(e) => onChange({ password: e.target.value })}
          className="mt-1.5"
          placeholder="At least 6 characters"
        />
      </div>

      <div>
        <Label htmlFor="signup-confirm">Confirm password</Label>
        <Input
          id="signup-confirm"
          type="password"
          autoComplete="new-password"
          value={draft.confirmPassword}
          onChange={(e) => onChange({ confirmPassword: e.target.value })}
          className="mt-1.5"
        />
      </div>

      <label className="flex items-start gap-2 text-sm text-[var(--mkt-ink)] cursor-pointer">
        <input
          type="checkbox"
          checked={draft.marketing_opt_in}
          onChange={(e) => onChange({ marketing_opt_in: e.target.checked })}
          className="mt-1 rounded border-[var(--mkt-paper-deep)]"
        />
        <span>Send me product tips and updates (optional)</span>
      </label>

      <div className="relative py-2">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-[var(--mkt-paper-deep)]" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-[var(--mkt-paper)] px-2 text-[var(--mkt-mist)]">or</span>
        </div>
      </div>

      <SignupOAuthButtons
        mode="signup"
        referralCode={draft.referral_code}
        onError={onError}
      />

      <p className="text-xs text-[var(--mkt-mist)] text-center">
        By continuing, you agree to our{" "}
        <Link href="/terms" className="underline hover:text-[var(--mkt-ink)]">
          Terms
        </Link>{" "}
        and{" "}
        <Link href="/privacy" className="underline hover:text-[var(--mkt-ink)]">
          Privacy Policy
        </Link>
        .
      </p>
    </div>
  );
}
