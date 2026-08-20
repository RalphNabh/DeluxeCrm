"use client";

import { cn } from "@/lib/utils";

type SignupStepTransitionProps = {
  stepKey: string;
  children: React.ReactNode;
  className?: string;
};

export function SignupStepTransition({
  stepKey,
  children,
  className,
}: SignupStepTransitionProps) {
  return (
    <div
      key={stepKey}
      className={cn(
        "animate-in fade-in slide-in-from-right-4 duration-300 fill-mode-both",
        className,
      )}
      aria-current="step"
    >
      {children}
    </div>
  );
}
