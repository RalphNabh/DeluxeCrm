"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import SignOutButton from "@/components/auth/sign-out";
import { formatCurrencyWithSymbol } from "@/lib/utils/currency";

export default function PortalPage() {
  const router = useRouter();
  const [data, setData] = useState<{
    estimates: Array<{ id: string; estimate_number: string; total: number; status: string }>;
    invoices: Array<{ id: string; invoice_number: string; total: number; status: string }>;
    jobs: Array<{ id: string; title: string; status: string; start_time: string }>;
  } | null>(null);
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch("/api/portal/dashboard")
      .then((r) => {
        if (r.status === 401) {
          router.push("/portal/login");
          return null;
        }
        return r.json();
      })
      .then((d) => d && setData(d));
  }, [router]);

  const submitRequest = async () => {
    if (!title.trim()) return;
    setSubmitting(true);
    const res = await fetch("/api/portal/requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, description }),
    });
    setSubmitting(false);
    if (res.ok) {
      setTitle("");
      setDescription("");
      setShowRequestForm(false);
      router.push("/portal/requests");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-4 py-4 flex justify-between items-center">
        <h1 className="text-xl font-bold text-gray-900">Client Hub</h1>
        <div className="flex gap-2">
          <Link href="/portal/messages">
            <Button variant="outline" size="sm">Messages</Button>
          </Link>
          <SignOutButton />
        </div>
      </header>

      <main className="max-w-3xl mx-auto p-4 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Request work</CardTitle>
          </CardHeader>
          <CardContent>
            {!showRequestForm ? (
              <Button onClick={() => setShowRequestForm(true)}>New service request</Button>
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
              <div key={e.id} className="flex justify-between border-b py-2 text-sm">
                <span>{e.estimate_number}</span>
                <span>{formatCurrencyWithSymbol(e.total)} — {e.status}</span>
              </div>
            ))}
            {!data?.estimates?.length && <p className="text-gray-500 text-sm">No estimates yet.</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Invoices</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(data?.invoices ?? []).map((inv) => (
              <div key={inv.id} className="flex justify-between border-b py-2 text-sm">
                <span>{inv.invoice_number}</span>
                <span>{formatCurrencyWithSymbol(inv.total)} — {inv.status}</span>
              </div>
            ))}
            {!data?.invoices?.length && <p className="text-gray-500 text-sm">No invoices yet.</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Scheduled jobs</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(data?.jobs ?? []).map((job) => (
              <div key={job.id} className="border-b py-2 text-sm">
                <div className="font-medium">{job.title}</div>
                <div className="text-gray-500">
                  {new Date(job.start_time).toLocaleString()} — {job.status}
                </div>
              </div>
            ))}
            {!data?.jobs?.length && <p className="text-gray-500 text-sm">No scheduled jobs.</p>}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
