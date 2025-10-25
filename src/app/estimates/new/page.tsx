"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { DollarSign, Search, User, ChevronDown, Check } from "lucide-react";

type Client = { id: string; name: string; email?: string; phone?: string };

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
  
  // Client dropdown state
  const [isClientDropdownOpen, setIsClientDropdownOpen] = useState(false);
  const [clientSearchTerm, setClientSearchTerm] = useState("");
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  // Filter clients based on search term
  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(clientSearchTerm.toLowerCase()) ||
    (client.email && client.email.toLowerCase().includes(clientSearchTerm.toLowerCase())) ||
    (client.phone && client.phone.includes(clientSearchTerm))
  );

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
    if (qClientId) {
      setClientId(qClientId);
      // Find and set the selected client
      const client = clients.find(c => c.id === qClientId);
      if (client) setSelectedClient(client);
    }
  }, [clients]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Element;
      if (!target.closest('.client-dropdown')) {
        setIsClientDropdownOpen(false);
      }
    }

    if (isClientDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isClientDropdownOpen]);

  function updateItem(idx: number, key: string, value: any) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, [key]: value } : it)));
  }

  function addItem() {
    setItems((prev) => [...prev, { description: "", quantity: 1, unit: "unit", unit_price: 0 }]);
  }

  function handleClientSelect(client: Client) {
    setSelectedClient(client);
    setClientId(client.id);
    setIsClientDropdownOpen(false);
    setClientSearchTerm("");
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
  const tax = Math.round(subtotal * 0.13 * 100) / 100;
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
            {/* Enhanced Client Dropdown */}
            <div className="relative client-dropdown">
              <div
                className="w-full border rounded-md p-3 cursor-pointer bg-white hover:bg-gray-50 transition-colors flex items-center justify-between"
                onClick={() => setIsClientDropdownOpen(!isClientDropdownOpen)}
              >
                <div className="flex items-center space-x-3">
                  <User className="h-5 w-5 text-gray-400" />
                  <div>
                    {selectedClient ? (
                      <div>
                        <div className="font-medium text-gray-900">{selectedClient.name}</div>
                        {selectedClient.email && (
                          <div className="text-sm text-gray-500">{selectedClient.email}</div>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-500">Select a client</span>
                    )}
                  </div>
                </div>
                <ChevronDown className={`h-5 w-5 text-gray-400 transition-transform ${isClientDropdownOpen ? 'rotate-180' : ''}`} />
              </div>

              {isClientDropdownOpen && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
                  <div className="p-2 border-b">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Search clients..."
                        value={clientSearchTerm}
                        onChange={(e) => setClientSearchTerm(e.target.value)}
                        className="pl-10"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                  </div>
                  
                  {filteredClients.length > 0 ? (
                    <div className="py-1">
                      {filteredClients.map((client) => (
                        <div
                          key={client.id}
                          className="px-4 py-3 hover:bg-gray-50 cursor-pointer flex items-center justify-between"
                          onClick={() => handleClientSelect(client)}
                        >
                          <div className="flex items-center space-x-3">
                            <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                              <User className="h-4 w-4 text-blue-600" />
                            </div>
                            <div>
                              <div className="font-medium text-gray-900">{client.name}</div>
                              {client.email && (
                                <div className="text-sm text-gray-500">{client.email}</div>
                              )}
                              {client.phone && (
                                <div className="text-sm text-gray-500">{client.phone}</div>
                              )}
                            </div>
                          </div>
                          {selectedClient?.id === client.id && (
                            <Check className="h-5 w-5 text-blue-600" />
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="px-4 py-3 text-gray-500 text-center">
                      {clientSearchTerm ? 'No clients found' : 'No clients available'}
                    </div>
                  )}
                </div>
              )}
            </div>
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
                    type="text"
                    placeholder="1"
                    value={it.quantity}
                    onChange={(e) => updateItem(i, "quantity", Number(e.target.value))}
                  />
                </div>
                <div className="col-span-2">
                  <Input
                    type="text"
                    placeholder="unit"
                    value={it.unit}
                    onChange={(e) => updateItem(i, "unit", e.target.value)}
                  />
                </div>
                <div className="col-span-2 relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    type="text"
                    placeholder="0.00"
                    value={it.unit_price}
                    onChange={(e) => updateItem(i, "unit_price", Number(e.target.value))}
                    className="pl-10"
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
              <span>Tax (13%)</span>
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


