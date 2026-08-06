"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrencyWithSymbol } from "@/lib/utils/currency";
import { downloadElementAsPdf, pdfFilenameSegment } from "@/lib/pdf/document-pdf";

type LineItem = {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  total: number;
};

type Payment = {
  id: string;
  amount: number;
  payment_method: string;
  payment_date: string;
  reference?: string;
  source?: string;
};

type Invoice = {
  id: string;
  invoice_number: string;
  status: string;
  subtotal: number;
  tax: number;
  total: number;
  due_date?: string;
  paid_at?: string;
  notes?: string;
  invoice_line_items?: LineItem[];
  payments?: Payment[];
};

export default function PortalInvoicePage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pdfRef = useRef<HTMLDivElement>(null);

  const loadInvoice = () =>
    fetch(`/api/portal/invoices/${id}`)
      .then(async (r) => {
        if (r.status === 401) {
          router.push("/portal/login");
          return null;
        }
        const data = await r.json();
        if (!r.ok) {
          setError(data.error || "Failed to load invoice");
          return null;
        }
        return data as Invoice;
      })
      .then((d) => d && setInvoice(d));

  useEffect(() => {
    loadInvoice().finally(() => setLoading(false));
  }, [id, router]);

  // Confirm Stripe return via session_id (never trust query flags alone).
  useEffect(() => {
    if (!id || typeof window === "undefined") return;
    const sessionId = new URLSearchParams(window.location.search).get("session_id");
    if (!sessionId) return;

    let cancelled = false;
    ;(async () => {
      try {
        const res = await fetch(
          `/api/invoices/${id}/confirm-checkout?session_id=${encodeURIComponent(sessionId)}`,
        );
        const data = await res.json();
        if (!cancelled && data.paid) {
          await loadInvoice();
        }
      } catch {
        // Webhook may still land.
      } finally {
        if (!cancelled) {
          window.history.replaceState({}, "", `/portal/invoices/${id}`);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const pay = async () => {
    if (!invoice) return;
    setPaying(true);
    setError(null);
    try {
      const res = await fetch(`/api/invoices/${invoice.id}/checkout`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok || !data.url) {
        setError(data.error || "Could not start payment");
        return;
      }
      window.location.href = data.url;
    } finally {
      setPaying(false);
    }
  };

  const downloadPdf = async () => {
    if (!pdfRef.current || !invoice) return;
    await downloadElementAsPdf(
      pdfRef.current,
      `Invoice-${invoice.invoice_number}-${pdfFilenameSegment("receipt")}.pdf`,
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 text-sm text-gray-500">
        Loading invoice…
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <p className="text-red-600 text-sm">{error || "Invoice not found"}</p>
        <Link href="/portal" className="text-sm text-blue-600 underline mt-2 inline-block">
          Back to Hub
        </Link>
      </div>
    );
  }

  const canPay = !["Paid", "Cancelled", "Draft"].includes(invoice.status);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-4 py-4 flex justify-between items-center">
        <h1 className="text-xl font-bold text-gray-900">
          Invoice {invoice.invoice_number}
        </h1>
        <Link href="/portal">
          <Button variant="outline" size="sm">
            Back to Hub
          </Button>
        </Link>
      </header>

      <main className="max-w-2xl mx-auto p-4 space-y-4">
        {error && (
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
        )}

        <div className="flex flex-wrap gap-2">
          {canPay && (
            <Button onClick={pay} disabled={paying}>
              {paying ? "Starting checkout…" : "Pay now"}
            </Button>
          )}
          {invoice.status === "Paid" && (
            <Button variant="outline" onClick={downloadPdf}>
              Download receipt PDF
            </Button>
          )}
        </div>

        <Card>
          <div ref={pdfRef} className="bg-white p-4">
            <CardHeader>
              <CardTitle className="text-base flex justify-between">
                <span>Invoice {invoice.invoice_number}</span>
                <span className="font-normal text-gray-600">{invoice.status}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {(invoice.invoice_line_items ?? []).map((li) => (
                <div key={li.id} className="flex justify-between border-b py-2">
                  <span>
                    {li.description} × {li.quantity}
                  </span>
                  <span>{formatCurrencyWithSymbol(li.total)}</span>
                </div>
              ))}
              <div className="flex justify-between pt-2">
                <span>Subtotal</span>
                <span>{formatCurrencyWithSymbol(invoice.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>Tax</span>
                <span>{formatCurrencyWithSymbol(invoice.tax)}</span>
              </div>
              <div className="flex justify-between font-semibold text-base">
                <span>Total</span>
                <span>{formatCurrencyWithSymbol(invoice.total)}</span>
              </div>
              {invoice.paid_at && (
                <p className="text-green-700 pt-2">
                  Paid {new Date(invoice.paid_at).toLocaleDateString()}
                </p>
              )}
              {(invoice.payments ?? []).length > 0 && (
                <div className="pt-3 border-t space-y-1">
                  <p className="font-medium">Payments</p>
                  {invoice.payments!.map((p) => (
                    <div key={p.id} className="flex justify-between text-gray-600">
                      <span>
                        {p.payment_date} · {p.payment_method}
                        {p.reference ? ` · ${p.reference}` : ""}
                      </span>
                      <span>{formatCurrencyWithSymbol(p.amount)}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </div>
        </Card>
      </main>
    </div>
  );
}
