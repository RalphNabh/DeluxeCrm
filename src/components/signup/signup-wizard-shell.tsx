"use client";

import Link from "next/link";
import Image from "next/image";
import { SignupProgress } from "@/components/signup/signup-progress";
import { SIGNUP_TESTIMONIALS, stepMeta } from "@/lib/signup-onboarding";
import { useMemo } from "react";

type SignupWizardShellProps = {
  stepIndex: number;
  children: React.ReactNode;
  footer: React.ReactNode;
  completing?: boolean;
};

export function SignupWizardShell({
  stepIndex,
  children,
  footer,
  completing = false,
}: SignupWizardShellProps) {
  const meta = stepMeta(stepIndex);
  const testimonial = useMemo(
    () => SIGNUP_TESTIMONIALS[stepIndex % SIGNUP_TESTIMONIALS.length],
    [stepIndex],
  );

  if (completing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--mkt-ink)] px-4">
        <div className="text-center space-y-6 max-w-md">
          <div className="mx-auto h-16 w-16 rounded-full border-4 border-[var(--mkt-signal)] border-t-transparent animate-spin" />
          <div>
            <h1 className="text-2xl font-bold text-white">Building your workspace…</h1>
            <p className="mt-2 text-[var(--mkt-mist)]">
              Setting up your CRM with answers you provided.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[var(--mkt-paper)]">
      {/* Left panel — branding */}
      <aside className="lg:w-[42%] xl:w-[38%] bg-[var(--mkt-ink)] text-white flex flex-col px-6 py-8 lg:px-10 lg:py-12">
        <Link
          href="/"
          className="inline-flex items-center gap-2.5 mb-10 text-2xl font-extrabold tracking-tight text-[var(--mkt-signal)]"
        >
          <Image
            src="/logo.png"
            alt=""
            width={40}
            height={40}
            className="h-9 w-9 rounded-lg"
            priority
          />
          DyluxePro
        </Link>

        <div className="flex-1 flex flex-col justify-center max-w-md">
          <p className="text-[var(--mkt-signal)] text-sm font-semibold uppercase tracking-wide mb-3">
            Free trial · No credit card
          </p>
          <h1 className="text-3xl lg:text-4xl font-bold leading-tight">
            {meta.title}
          </h1>
          <p className="mt-4 text-lg text-white/75">{meta.subtitle}</p>

          <blockquote className="mt-12 hidden lg:block border-l-2 border-[var(--mkt-signal)] pl-4">
            <p className="text-white/90 italic">&ldquo;{testimonial.quote}&rdquo;</p>
            <footer className="mt-3 text-sm text-white/60">
              — {testimonial.author}, {testimonial.role}
            </footer>
          </blockquote>
        </div>

        <p className="mt-8 text-sm text-white/50 hidden lg:block">
          Already have an account?{" "}
          <Link href="/login" className="text-[var(--mkt-signal)] hover:underline">
            Sign in
          </Link>
        </p>
      </aside>

      {/* Right panel — step content */}
      <main className="flex-1 flex flex-col min-h-0">
        <div className="sticky top-0 z-10 bg-[var(--mkt-paper)]/95 backdrop-blur px-6 py-4 lg:px-10 border-b border-[var(--mkt-paper-deep)]">
          <SignupProgress currentStep={stepIndex + 1} />
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-8 lg:px-10 lg:py-10">
          <div className="max-w-lg mx-auto w-full">{children}</div>
        </div>

        <div className="sticky bottom-0 bg-[var(--mkt-paper)]/95 backdrop-blur border-t border-[var(--mkt-paper-deep)] px-6 py-4 lg:px-10">
          <div className="max-w-lg mx-auto w-full flex items-center gap-3">{footer}</div>
        </div>
      </main>
    </div>
  );
}
