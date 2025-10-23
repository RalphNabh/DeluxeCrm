"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type Client = { id: string; name: string };

export default function NewEstimatePage() {
  const router = useRouter();
  const params = useSearchParams();
  const [clients, setClients] = useState<Client[]>([]);
  const [clientId, setClientId] = useState("");
  const [leadId, setLeadId] = useState<string | null>(null);
  const [items, setItems] = useState([
    { description: "", quantity: 1, unit: "unit", unit_price: 0 },
  ]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Load clients for selection
    (async () => {
      try {
        const res = await fetch("/api/clients");
        if (!res.ok) throw new Error("Failed to load clients");
        const data = await res.json();
        setClients(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load clients");
      }
    })();
    // Prefill from query params
    const qClientId = params.get('clientId');
    if (qClientId) setClientId(qClientId);
  }, []);

  function updateItem(idx: number, key: string, value: any) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, [key]: value } : it)));
  }

  function addItem() {
    setItems((prev) => [...prev, { description: "", quantity: 1, unit: "unit", unit_price: 0 }]);
  }

  async function createAndSend(send: boolean) {
    try {
      setSending(true);
      setError(null);
      const body = {
        client_id: clientId,
        lead_id: leadId,
        lineItems: items,
        send,
      };
      const res = await fetch("/api/estimates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed to create estimate");
      router.push("/estimates");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create estimate");
    } finally {
      setSending(false);
    }
  }

  const subtotal = items.reduce(
    (sum, it) => sum + Number(it.quantity || 0) * Number(it.unit_price || 0),
    0
  );
  const tax = Math.round(subtotal * 0.07 * 100) / 100;
  const total = subtotal + tax;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">New Estimate</h1>
          <Link href="/estimates">
            <Button variant="outline">Cancel</Button>
          </Link>
        </div>

        {error && (
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Client</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <select
              className="w-full border rounded-md p-2"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
            >
              <option value="">Select a client</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <Input
              placeholder="Optional: existing lead id"
              value={leadId ?? ""}
              onChange={(e) => setLeadId(e.target.value || null)}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Line Items</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {items.map((it, i) => (
              <div key={i} className="grid grid-cols-12 gap-2">
                <div className="col-span-6">
                  <Input
                    placeholder="Description"
                    value={it.description}
                    onChange={(e) => updateItem(i, "description", e.target.value)}
                  />
                </div>
                <div className="col-span-2">
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="Qty"
                    value={it.quantity}
                    onChange={(e) => updateItem(i, "quantity", Number(e.target.value))}
                  />
                </div>
                <div className="col-span-2">
                  <Input
                    placeholder="Unit"
                    value={it.unit}
                    onChange={(e) => updateItem(i, "unit", e.target.value)}
                  />
                </div>
                <div className="col-span-2">
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="Unit Price"
                    value={it.unit_price}
                    onChange={(e) => updateItem(i, "unit_price", Number(e.target.value))}
                  />
                </div>
              </div>
            ))}
            <Button variant="outline" onClick={addItem}>
              Add Item
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Subtotal</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Tax (7%)</span>
              <span>${tax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-semibold">
              <span>Total</span>
              <span>${total.toFixed(2)}</span>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3 justify-end">
          <Button
            disabled={!clientId || sending}
            onClick={() => createAndSend(false)}
          >
            Create Draft
          </Button>
          <Button
            disabled={!clientId || sending}
            onClick={() => createAndSend(true)}
          >
            Create & Send
          </Button>
        </div>
      </div>
    </div>
  );
}


