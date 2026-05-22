"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Sparkles, ArrowUpRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

/**
 * Small dashboard widget showing how many AI Estimates the current user has
 * used this month and when the quota resets. Used on the settings and
 * subscription pages.
 *
 * Pulls from GET /api/ai-estimates/analyze which returns the current
 * QuotaStatus. Renders nothing while loading so we don't flash empty cards.
 */

interface QuotaStatus {
  tier: string;
  cap: number;
  used: number;
  remaining: number;
  resetsAt: string;
  yearMonth: string;
}

function tierLabel(tier: string): string {
  if (tier === "starter") return "Starter";
  if (tier === "professional") return "Professional";
  if (tier === "enterprise") return "Enterprise";
  return "Free trial";
}

function isUnlimited(cap: number): boolean {
  return !Number.isFinite(cap);
}

function pctUsed(used: number, cap: number): number {
  if (!Number.isFinite(cap) || cap <= 0) return 0;
  return Math.min(100, Math.round((used / cap) * 100));
}

export default function AiUsageWidget() {
  const [quota, setQuota] = useState<QuotaStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch("/api/ai-estimates/analyze");
        if (res.ok && mounted) {
          const data = (await res.json()) as { quota: QuotaStatus };
          setQuota(data.quota);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  if (loading || !quota) return null;

  const unlimited = isUnlimited(quota.cap);
  const pct = pctUsed(quota.used, quota.cap);
  const nearLimit = !unlimited && quota.remaining <= Math.max(1, Math.floor(quota.cap * 0.2));

  return (
    <Card className="border-gray-200 bg-white">
      <CardHeader>
        <CardTitle className="flex items-center text-gray-900">
          <Sparkles className="h-5 w-5 mr-2 text-teal-600" />
          AI Estimates
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-end justify-between gap-4">
          <div>
            <div className="text-3xl font-bold text-gray-900">
              {quota.used}
              <span className="text-base font-normal text-gray-500">
                {unlimited ? " used this month" : ` / ${quota.cap}`}
              </span>
            </div>
            <div className="text-sm text-gray-500 mt-1">
              {tierLabel(quota.tier)} plan ·{" "}
              {unlimited
                ? "Unlimited"
                : `Resets ${new Date(quota.resetsAt).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                  })}`}
            </div>
          </div>
          <Link href="/estimates/new/ai">
            <Button size="sm" className="bg-teal-600 hover:bg-teal-700">
              New AI estimate
            </Button>
          </Link>
        </div>

        {!unlimited && (
          <div className="space-y-1.5">
            <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all ${
                  nearLimit
                    ? "bg-gradient-to-r from-amber-500 to-red-500"
                    : "bg-gradient-to-r from-teal-500 to-emerald-500"
                }`}
                style={{ width: `${pct}%` }}
              />
            </div>
            {nearLimit && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-amber-700">
                  {quota.remaining === 0
                    ? "You've used all your AI estimates this month."
                    : `Only ${quota.remaining} left this month.`}
                </span>
                <Link
                  href="/subscription"
                  className="text-teal-700 hover:text-teal-800 font-medium inline-flex items-center"
                >
                  Upgrade <ArrowUpRight className="h-3 w-3 ml-0.5" />
                </Link>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
