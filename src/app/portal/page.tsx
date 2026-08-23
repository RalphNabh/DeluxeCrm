"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrencyWithSymbol } from "@/lib/utils/currency";
import { Suspense } from "react";
import PortalShell from "@/components/portal/portal-shell";

function PortalDashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [data, setData] = useState<{
    estimates: Array<{ id: string; estimate_number: string; total: number; status: string }>;
    invoices: Array<{
      id: string;
      invoice_number: string;
      total: number;
      status: string;
      paid_at?: string | null;
    }>;
    jobs: Array<{ id: string; title: string; status: string; start_time: string }>;
    client?: { name: string; email: string | null };
    organization?: { name: string };
  } | null>(null);
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [photos, setPhotos] = useState<FileList | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const paid = searchParams.get("paid");
    if (paid === "1") setBanner("Payment submitted. Status updates when Stripe confirms.");
    if (paid === "0") setBanner("Checkout cancelled.");
  }, [searchParams]);

  const load = () => {
    fetch("/api/portal/dashboard")
      .then((r) => {
        if (r.status === 401) {
          router.push("/portal/login");
          return null;
        }
        return r.json();
      })
      .then((d) => d && setData(d));
  };

  useEffect(() => {
    load();
  }, [router]);

  const submitRequest = async () => {
    if (!title.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      let res: Response;
      if (photos && photos.length > 0) {
        const form = new FormData();
        form.set("title", title);
        form.set("description", description);
        Array.from(photos).forEach((f) => form.append("photos", f));
        res = await fetch("/api/portal/requests", { method: "POST", body: form });
      } else {
        res = await fetch("/api/portal/requests", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, description }),
        });
      }
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error || "Failed to submit request");
        return;
      }
      setTitle("");
      setDescription("");
      setPhotos(null);
      setShowRequestForm(false);
      router.push("/portal/requests");
    } finally {
      setSubmitting(false);
    }
  };

  const payInvoice = async (invoiceId: string) => {
    setPayingId(invoiceId);
    setError(null);
    try {
      const res = await fetch(`/api/invoices/${invoiceId}/checkout`, {
        method: "POST",
      });
      const body = await res.json();
      if (!res.ok || !body.url) {
        setError(body.error || "Could not start payment");
        return;
      }
      window.location.href = body.url;
    } finally {
      setPayingId(null);
    }
  };

  const canPay = (status: string) =>
    !["Paid", "Cancelled", "Draft"].includes(status);

  const firstName = data?.client?.name?.trim().split(/\s+/)[0];

  return (
    <PortalShell>
      <main className="max-w-3xl mx-auto p-4 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            {firstName ? `Hi, ${firstName}` : "Welcome"}
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Quotes, invoices, and jobs from{" "}
            <span className="font-medium text-slate-800">
              {data?.organization?.name ?? "your contractor"}
            </span>
            .
          </p>
        </div>

        {banner && (
          <div className="rounded-md bg-blue-50 p-3 text-sm text-blue-800">{banner}</div>
        )}
        {error && (
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Request work</CardTitle>
          </CardHeader>
          <CardContent>
            {!showRequestForm ? (
              <div className="space-y-2">
                <p className="text-sm text-slate-600">
                  Tell your contractor what you need. They will see it in their Requests inbox.
                </p>
                <Button onClick={() => setShowRequestForm(true)}>New service request</Button>
              </div>
            ) : (
              <div className="space-y-3">
                <Input
                  placeholder="What do you need done?"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
                <Textarea
                  placeholder="Describe the job..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
                <div>
                  <label className="text-sm text-gray-600 block mb-1">
                    Photos (optional, up to 5)
                  </label>
                  <Input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => setPhotos(e.target.files)}
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={submitRequest} disabled={submitting}>
                    Submit request
                  </Button>
                  <Button variant="ghost" onClick={() => setShowRequestForm(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Estimates</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(data?.estimates ?? []).map((e) => (
              <div
                key={e.id}
                className="flex justify-between items-center border-b py-3 text-sm gap-2 last:border-0"
              >
                <Link
                  href={`/portal/estimates/${e.id}`}
                  className="text-teal-800 font-medium hover:underline"
                >
                  {e.estimate_number}
                </Link>
                <span className="text-right text-slate-700">
                  {formatCurrencyWithSymbol(e.total)} · {e.status}
                  {["Sent", "Changes Requested"].includes(e.status) && (
                    <Link
                      href={`/portal/estimates/${e.id}`}
                      className="ml-2 text-teal-800 hover:underline"
                    >
                      Review
                    </Link>
                  )}
                </span>
              </div>
            ))}
            {!data?.estimates?.length && (
              <p className="text-gray-500 text-sm">
                No estimates yet - your contractor will send one here.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Invoices</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(data?.invoices ?? []).map((inv) => (
              <div
                key={inv.id}
                className="flex justify-between items-center border-b py-3 text-sm gap-2 last:border-0"
              >
                <Link
                  href={`/portal/invoices/${inv.id}`}
                  className="text-teal-800 font-medium hover:underline"
                >
                  {inv.invoice_number}
                </Link>
                <div className="flex items-center gap-2">
                  <span>
                    {formatCurrencyWithSymbol(inv.total)} · {inv.status}
                  </span>
                  {inv.status === "Paid" ? (
                    <Link href={`/portal/invoices/${inv.id}`}>
                      <Button variant="outline" size="sm">
                        Receipt
                      </Button>
                    </Link>
                  ) : canPay(inv.status) ? (
                    <Button
                      size="sm"
                      disabled={payingId === inv.id}
                      onClick={() => payInvoice(inv.id)}
                    >
                      {payingId === inv.id ? "…" : "Pay"}
                    </Button>
                  ) : null}
                </div>
              </div>
            ))}
            {!data?.invoices?.length && (
              <p className="text-gray-500 text-sm">
                No invoices yet - they will appear here when your contractor bills you.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Scheduled jobs</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(data?.jobs ?? []).map((job) => (
              <div key={job.id} className="border-b py-3 text-sm last:border-0">
                <div className="font-medium">{job.title}</div>
                <div className="text-gray-500">
                  {new Date(job.start_time).toLocaleString()} · {job.status}
                </div>
              </div>
            ))}
            {!data?.jobs?.length && (
              <p className="text-gray-500 text-sm">
                No scheduled jobs yet.
              </p>
            )}
          </CardContent>
        </Card>
      </main>
    </PortalShell>
  );
}

export default function PortalPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 p-6 text-sm text-gray-500">
          Loading…
        </div>
      }
    >
      <PortalDashboard />
    </Suspense>
  );
}
