"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { SignupWizardShell } from "@/components/signup/signup-wizard-shell";
import { SignupStepTransition } from "@/components/signup/signup-step-transition";
import { CredentialsStep } from "@/components/signup/steps/credentials-step";
import { NameStep } from "@/components/signup/steps/name-step";
import { PhoneStep } from "@/components/signup/steps/phone-step";
import { CompanyStep } from "@/components/signup/steps/company-step";
import { IndustryStep } from "@/components/signup/steps/industry-step";
import { TeamSizeStep } from "@/components/signup/steps/team-size-step";
import { YearsStep } from "@/components/signup/steps/years-step";
import { GoalsStep } from "@/components/signup/steps/goals-step";
import { ReferralStep } from "@/components/signup/steps/referral-step";
import { RevenueStep } from "@/components/signup/steps/revenue-step";
import {
  clampSignupStepIndex,
  emptySignupDraft,
  SIGNUP_STEP_COUNT,
  SIGNUP_STEPS,
  SIGNUP_WIZARD_DRAFT_KEY,
  type OnboardingSettings,
  type SignupWizardDraft,
} from "@/lib/signup-onboarding";
import {
  formatAuthErrorMessage,
  mapAuthError,
  SIGNUP_PENDING_EMAIL_KEY,
} from "@/lib/auth-email-redirect";
import { markWelcomePending } from "@/lib/welcome-notification";

type PersistedDraft = Omit<SignupWizardDraft, "password" | "confirmPassword">;

function loadDraft(referralCode: string): SignupWizardDraft {
  if (typeof window === "undefined") return emptySignupDraft(referralCode);
  try {
    const raw = sessionStorage.getItem(SIGNUP_WIZARD_DRAFT_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as PersistedDraft;
      return {
        ...emptySignupDraft(referralCode),
        ...parsed,
        password: "",
        confirmPassword: "",
        referral_code: referralCode || parsed.referral_code || "",
        stepIndex: parsed.stepIndex ?? 0,
      };
    }
  } catch {
    /* ignore */
  }
  return emptySignupDraft(referralCode);
}

/** Passwords are excluded from sessionStorage. */
function saveDraft(draft: SignupWizardDraft) {
  if (typeof window === "undefined") return;
  const { password: _p, confirmPassword: _c, ...safe } = draft;
  sessionStorage.setItem(SIGNUP_WIZARD_DRAFT_KEY, JSON.stringify(safe));
}

function clearDraft() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(SIGNUP_WIZARD_DRAFT_KEY);
}

function buildOnboardingPayload(draft: SignupWizardDraft): OnboardingSettings {
  return {
    team_size: draft.team_size || undefined,
    years_in_business: draft.years_in_business || undefined,
    primary_goals: draft.primary_goals.length ? draft.primary_goals : undefined,
    referral_source: draft.referral_source || undefined,
    estimated_revenue: draft.estimated_revenue || undefined,
    marketing_opt_in: draft.marketing_opt_in,
  };
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function stepCanContinue(
  stepIndex: number,
  draft: SignupWizardDraft,
  oauthMode: boolean,
): boolean {
  switch (SIGNUP_STEPS[stepIndex]?.id) {
    case "credentials":
      if (oauthMode) return true;
      return (
        isValidEmail(draft.email) &&
        draft.password.length >= 6 &&
        draft.password === draft.confirmPassword
      );
    case "name":
      return draft.first_name.trim().length > 0 && draft.last_name.trim().length > 0;
    case "phone":
      return true;
    case "company":
      return draft.company_name.trim().length > 0;
    case "industry":
      return draft.business_type.trim().length > 0;
    case "team_size":
      return draft.team_size !== "";
    case "years_in_business":
      return draft.years_in_business !== "";
    case "goals":
      return draft.primary_goals.length > 0;
    case "referral":
      return draft.referral_source !== "";
    case "revenue":
      return true;
    default:
      return false;
  }
}

export function SignupWizard() {
  const router = useRouter();
  const [stepIndex, setStepIndex] = useState(0);
  const [draft, setDraft] = useState<SignupWizardDraft>(() => emptySignupDraft());
  const [oauthMode, setOauthMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  const firstFieldRef = useRef<HTMLDivElement>(null);

  const goToStep = useCallback(
    (nextStep: number, currentDraft?: SignupWizardDraft, oauth?: boolean) => {
      const mode = oauth ?? oauthMode;
      const base = currentDraft ?? draft;
      const clamped = clampSignupStepIndex(nextStep, mode);
      const nextDraft = { ...base, stepIndex: clamped, oauthMode: mode };
      saveDraft(nextDraft);
      setStepIndex(clamped);
      setDraft(nextDraft);
    },
    [draft, oauthMode],
  );

  const updateDraft = useCallback((patch: Partial<SignupWizardDraft>) => {
    setDraft((prev) => {
      const next = { ...prev, ...patch };
      saveDraft(next);
      return next;
    });
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const referralCode = (params.get("ref") || "").trim().toUpperCase();
    const oauthContinue = params.get("oauth") === "continue";
    const prefillEmail = params.get("email") || "";

    async function init() {
      let initial = loadDraft(referralCode);
      if (prefillEmail) {
        initial = { ...initial, email: prefillEmail };
      }

      let oauth = oauthContinue || initial.oauthMode;
      let restoredStep = initial.stepIndex ?? 0;

      try {
        const res = await fetch("/api/auth/signup-status");
        if (res.ok) {
          const data = (await res.json()) as {
            needsOnboarding?: boolean;
            email?: string;
            redirectTo?: string;
          };
          if (data.redirectTo) {
            router.replace(data.redirectTo);
            return;
          }
          if (data.needsOnboarding) {
            oauth = true;
            initial = {
              ...initial,
              oauthMode: true,
              email: data.email || initial.email,
            };
          }
        }
      } catch {
        /* anonymous or transient error — continue */
      }

      restoredStep = clampSignupStepIndex(restoredStep, oauth);
      initial = { ...initial, oauthMode: oauth, stepIndex: restoredStep };
      saveDraft(initial);

      setOauthMode(oauth);
      setDraft(initial);
      setStepIndex(restoredStep);
      setReady(true);
    }

    void init();
  }, [router]);

  useEffect(() => {
    if (!ready) return;
    firstFieldRef.current?.querySelector<HTMLElement>("input, button")?.focus();
  }, [stepIndex, ready]);

  const canContinue = stepCanContinue(stepIndex, draft, oauthMode);
  const isLastStep = stepIndex === SIGNUP_STEP_COUNT - 1;

  const handleBack = () => {
    setError("");
    const minStep = oauthMode ? 1 : 0;
    goToStep(Math.max(minStep, stepIndex - 1));
  };

  const submitSignup = async () => {
    setLoading(true);
    setError("");

    const onboarding = buildOnboardingPayload(draft);
    const body = {
      first_name: draft.first_name.trim(),
      last_name: draft.last_name.trim(),
      phone: draft.phone.trim() || undefined,
      company_name: draft.company_name.trim(),
      business_type: draft.business_type.trim(),
      marketing_opt_in: draft.marketing_opt_in,
      team_size: onboarding.team_size,
      years_in_business: onboarding.years_in_business,
      primary_goals: onboarding.primary_goals,
      referral_source: onboarding.referral_source,
      estimated_revenue: onboarding.estimated_revenue,
      referral_code: draft.referral_code || undefined,
    };

    try {
      setCompleting(true);

      if (oauthMode) {
        const response = await fetch("/api/auth/complete-signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = (await response.json()) as {
          error?: string;
          code?: string;
          redirect?: string;
        };

        if (!response.ok) {
          setCompleting(false);
          const mapped = mapAuthError(data.error || "Signup failed", {
            code: data.code,
          });
          setError(mapped.message);
          return;
        }

        await new Promise((r) => setTimeout(r, 1500));
        markWelcomePending();
        clearDraft();
        router.push(data.redirect || "/account-verified");
        return;
      }

      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...body,
          email: draft.email.trim(),
          password: draft.password,
        }),
      });

      const data = (await response.json()) as {
        error?: string;
        code?: string;
        details?: Record<string, string>;
        email?: string;
      };

      if (!response.ok) {
        setCompleting(false);
        const mapped = mapAuthError(data.error || "Signup failed", {
          code: data.code,
          details: data.details,
        });
        setError(mapped.message);
        return;
      }

      const confirmedEmail = data.email || draft.email.trim();
      await new Promise((r) => setTimeout(r, 1500));
      markWelcomePending();
      sessionStorage.setItem(
        SIGNUP_PENDING_EMAIL_KEY,
        confirmedEmail.toLowerCase(),
      );
      clearDraft();
      router.push(`/signup/confirm?email=${encodeURIComponent(confirmedEmail)}`);
    } catch (err) {
      setCompleting(false);
      setError(formatAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleContinue = async () => {
    setError("");
    if (!canContinue) return;

    if (isLastStep) {
      await submitSignup();
      return;
    }

    goToStep(stepIndex + 1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && canContinue && !loading) {
      e.preventDefault();
      void handleContinue();
    }
  };

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--mkt-paper)]">
        <div className="h-8 w-8 rounded-full border-2 border-[var(--mkt-signal)] border-t-transparent animate-spin" />
      </div>
    );
  }

  const stepId = SIGNUP_STEPS[stepIndex]?.id ?? "credentials";

  const renderStep = () => {
    switch (stepId) {
      case "credentials":
        return (
          <CredentialsStep
            draft={draft}
            onChange={updateDraft}
            oauthMode={oauthMode}
            onError={setError}
          />
        );
      case "name":
        return <NameStep draft={draft} onChange={updateDraft} />;
      case "phone":
        return <PhoneStep draft={draft} onChange={updateDraft} />;
      case "company":
        return <CompanyStep draft={draft} onChange={updateDraft} />;
      case "industry":
        return <IndustryStep draft={draft} onChange={updateDraft} />;
      case "team_size":
        return <TeamSizeStep draft={draft} onChange={updateDraft} />;
      case "years_in_business":
        return <YearsStep draft={draft} onChange={updateDraft} />;
      case "goals":
        return <GoalsStep draft={draft} onChange={updateDraft} />;
      case "referral":
        return <ReferralStep draft={draft} onChange={updateDraft} />;
      case "revenue":
        return <RevenueStep draft={draft} onChange={updateDraft} />;
      default:
        return null;
    }
  };

  return (
    <SignupWizardShell
      stepIndex={stepIndex}
      completing={completing}
      footer={
        <>
          {stepIndex > (oauthMode ? 1 : 0) ? (
            <Button
              type="button"
              variant="outline"
              onClick={handleBack}
              disabled={loading}
            >
              Back
            </Button>
          ) : (
            <span />
          )}
          <Button
            type="button"
            className="ml-auto flex-1 sm:flex-none sm:min-w-[140px]"
            disabled={!canContinue || loading}
            onClick={() => void handleContinue()}
          >
            {loading
              ? "Please wait…"
              : isLastStep
                ? "Create account"
                : "Continue"}
          </Button>
        </>
      }
    >
      <div ref={firstFieldRef} onKeyDown={handleKeyDown}>
        <SignupStepTransition stepKey={stepId}>{renderStep()}</SignupStepTransition>

        {error ? (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}
      </div>
    </SignupWizardShell>
  );
}
