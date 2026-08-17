"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrencyWithSymbol } from "@/lib/utils/currency";
import PortalShell from "@/components/portal/portal-shell";

type LineItem = {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  total: number;
};

type Estimate = {
  id: string;
  estimate_number: string;
  status: string;
  subtotal: number;
  tax: number;
  total: number;
  contract_message?: string;
  valid_until?: string;
  estimate_line_items?: LineItem[];
};

export default function PortalEstimatePage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [contractAgreed, setContractAgreed] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [showChangeForm, setShowChangeForm] = useState(false);
  const [changeNote, setChangeNote] = useState("");

  useEffect(() => {
    fetch(`/api/portal/estimates/${id}`)
      .then(async (r) => {
        if (r.status === 401) {
          router.push("/portal/login");
          return null;
        }
        const data = await r.json();
        if (!r.ok) {
          setError(data.error || "Failed to load estimate");
          return null;
        }
        return data as Estimate;
      })
      .then((d) => d && setEstimate(d))
      .finally(() => setLoading(false));
  }, [id, router]);

  const canAct =
    estimate &&
    ["Sent", "Changes Requested"].includes(estimate.status) &&
    !acting;

  const runAction = async (action: "approve" | "request_changes") => {
    if (!estimate) return;
    if (action === "approve" && estimate.contract_message && !contractAgreed) {
      setError("Please agree to the terms before approving.");
      return;
    }
    if (action === "request_changes") {
      if (!showChangeForm) {
        setShowChangeForm(true);
        setError(null);
        return;
      }
      if (!changeNote.trim()) {
        setError("Please describe the changes you need.");
        return;
      }
    }
    setActing(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/portal/estimates/${id}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          clientMessage: action === "request_changes" ? changeNote.trim() : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Action failed");
        return;
      }
      setEstimate({ ...estimate, status: data.status });
      setShowChangeForm(false);
      setMessage(
        action === "request_changes"
          ? "Change request sent. Your contractor can reply in Messages."
          : data.message || "Updated",
      );
    } finally {
      setActing(false);
    }
  };

  if (loading) {
    return (
      <PortalShell>
        <div className="max-w-3xl mx-auto p-6 text-sm text-gray-500">
          Loading estimate…
        </div>
      </PortalShell>
    );
  }

  if (!estimate) {
    return (
      <PortalShell>
        <div className="max-w-3xl mx-auto p-6">
          <p className="text-red-600 text-sm">{error || "Estimate not found"}</p>
          <Link href="/portal" className="text-sm text-teal-800 underline mt-2 inline-block">
            Back to Hub
          </Link>
        </div>
      </PortalShell>
    );
  }

  return (
    <PortalShell title={`Estimate ${estimate.estimate_number}`}>
      <main className="max-w-3xl mx-auto p-4 space-y-4">
        {error && (
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
        )}
        {message && (
          <div className="rounded-md bg-green-50 p-3 text-sm text-green-700">
            {message}{" "}
            {estimate.status === "Changes Requested" && (
              <Link href="/portal/messages" className="underline font-medium">
                Open Messages
              </Link>
            )}
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex justify-between">
              <span>Status</span>
              <span className="font-normal text-gray-600">{estimate.status}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {(estimate.estimate_line_items ?? []).map((li) => (
              <div key={li.id} className="flex justify-between border-b py-2">
                <span>
                  {li.description} × {li.quantity}
                </span>
                <span>{formatCurrencyWithSymbol(li.total)}</span>
              </div>
            ))}
            <div className="flex justify-between pt-2">
              <span>Subtotal</span>
              <span>{formatCurrencyWithSymbol(estimate.subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span>Tax</span>
              <span>{formatCurrencyWithSymbol(estimate.tax)}</span>
            </div>
            <div className="flex justify-between font-semibold text-base">
              <span>Total</span>
              <span>{formatCurrencyWithSymbol(estimate.total)}</span>
            </div>
            {estimate.contract_message && !canAct && (
              <p className="text-gray-600 pt-2 whitespace-pre-wrap">{estimate.contract_message}</p>
            )}
          </CardContent>
        </Card>

        {estimate.contract_message && canAct && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Terms</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-gray-700 whitespace-pre-wrap">
                {estimate.contract_message}
              </p>
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={contractAgreed}
                  onChange={(e) => setContractAgreed(e.target.checked)}
                  className="mt-1"
                />
                <span>I agree to the terms above</span>
              </label>
            </CardContent>
          </Card>
        )}

        {canAct && (
          <div className="space-y-3">
            {showChangeForm && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">What would you like changed?</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Textarea
                    value={changeNote}
                    onChange={(e) => setChangeNote(e.target.value)}
                    placeholder="Example: Please use a cheaper tile, and move the start date to next month."
                    rows={4}
                    maxLength={5000}
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button
                      onClick={() => runAction("request_changes")}
                      disabled={acting || !changeNote.trim()}
                    >
                      Send change request
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setShowChangeForm(false);
                        setError(null);
                      }}
                      disabled={acting}
                    >
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => runAction("approve")} disabled={acting}>
                Approve estimate
              </Button>
              {!showChangeForm && (
                <Button
                  variant="outline"
                  onClick={() => runAction("request_changes")}
                  disabled={acting}
                >
                  Request changes
                </Button>
              )}
            </div>
          </div>
        )}
      </main>
    </PortalShell>
  );
}
