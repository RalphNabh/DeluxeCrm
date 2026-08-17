"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import {
  formatPhoneAsYouType,
  isUnusualPhone,
  UNUSUAL_PHONE_NOTE,
} from "@/lib/phone";
import { cn } from "@/lib/utils";

type PhoneInputProps = Omit<
  React.ComponentProps<typeof Input>,
  "value" | "onChange" | "type"
> & {
  value: string;
  onChange: (value: string) => void;
};

const PhoneInput = React.forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ value, onChange, onBlur, className, ...props }, ref) => {
    const [committed, setCommitted] = React.useState(false);
    const display = formatPhoneAsYouType(value ?? "");
    const unusual = isUnusualPhone(display, committed);

    return (
      <div className="w-full">
        <Input
          ref={ref}
          {...props}
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder={props.placeholder ?? "(555) 123-4567"}
          value={display}
          onChange={(e) => {
            setCommitted(false);
            onChange(formatPhoneAsYouType(e.target.value));
          }}
          onBlur={(e) => {
            setCommitted(true);
            onBlur?.(e);
          }}
          className={cn(unusual && "border-amber-400 focus-visible:ring-amber-400", className)}
        />
        {unusual ? (
          <p className="mt-1 text-xs text-amber-700">{UNUSUAL_PHONE_NOTE}</p>
        ) : null}
      </div>
    );
  },
);
PhoneInput.displayName = "PhoneInput";

export { PhoneInput };
