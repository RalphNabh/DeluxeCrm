"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Mail, RefreshCw, XCircle } from "lucide-react";

export type CheckEmailVariant = "post-signup" | "pending-verification";

interface CheckEmailPanelProps {
  email: string;
  variant: CheckEmailVariant;
  message: string | null;
  resending: boolean;
  onResend: () => void;
  onCheckStatus?: () => void;
  checkingStatus?: boolean;
}

export default function CheckEmailPanel({
  email,
  variant,
  message,
  resending,
  onResend,
  onCheckStatus,
  checkingStatus = false,
}: CheckEmailPanelProps) {
  const isSuccessMessage =
    message != null &&
    (message.includes("sent") || message.includes("verified"));

  return (
    <div className="max-w-md w-full space-y-8">
      {variant === "post-signup" && (
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-emerald-100 mb-4">
            <CheckCircle className="h-8 w-8 text-emerald-600" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Account created</h2>
          <p className="text-gray-600">
            One more step — confirm your email to get started.
          </p>
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-teal-100 mb-4">
            <Mail className="h-6 w-6 text-teal-600" />
          </div>
          <CardTitle className="text-center">
            {variant === "post-signup" ? "Check your email" : "Verify your email"}
          </CardTitle>
          <CardDescription className="text-center text-base">
            We sent a confirmation link to{" "}
            <strong className="text-gray-900">{email}</strong>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-gray-600 space-y-2 text-center">
            <p>
              Open the email and click the link to verify your account. The link
              expires after 24 hours.
            </p>
            <p className="font-medium text-gray-700">
              You can sign in after your email is confirmed.
            </p>
          </div>

          {message && (
            <div
              className={`rounded-md p-4 border text-sm ${
                isSuccessMessage
                  ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                  : "bg-red-50 text-red-700 border-red-200"
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                {isSuccessMessage ? (
                  <CheckCircle className="h-5 w-5 shrink-0" />
                ) : (
                  <XCircle className="h-5 w-5 shrink-0" />
                )}
                {message}
              </div>
            </div>
          )}

          <div className="space-y-3">
            <Button
              type="button"
              onClick={onResend}
              disabled={resending}
              variant="outline"
              className="w-full"
            >
              {resending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Sending…
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4 mr-2" />
                  Resend confirmation email
                </>
              )}
            </Button>

            {onCheckStatus && (
              <Button
                type="button"
                onClick={onCheckStatus}
                disabled={checkingStatus}
                variant="outline"
                className="w-full"
              >
                {checkingStatus ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Checking…
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    I&apos;ve confirmed — continue
                  </>
                )}
              </Button>
            )}

            <div className="text-center pt-2 border-t">
              <p className="text-xs text-gray-500 mb-3">
                Didn&apos;t receive it? Check spam or promotions, then resend.
              </p>
              <Link
                href="/login"
                className="text-sm font-medium text-teal-600 hover:text-teal-700"
              >
                Back to sign in
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
