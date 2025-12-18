"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Search, User, ChevronDown, Check } from "lucide-react";
import MaterialSelector from "@/components/estimates/material-selector";

type Client = { id: string; name: string; email?: string; phone?: string };

function NewEstimateContent() {
  const router = useRouter();
  const params = useSearchParams();
  const [clients, setClients] = useState<Client[]>([]);
  const [clientId, setClientId] = useState("");
  const [leadId, setLeadId] = useState<string | null>(null);
  const [items, setItems] = useState<Array<{
    description: string;
    quantity: number;
    unit: string;
    unit_price: number | string;
    material_id?: string;
  }>>([
    { description: "", quantity: 1, unit: "unit", unit_price: 0 },
  ]);
  const [materialIds, setMaterialIds] = useState<Record<number, string>>({});
  const [contractMessage, setContractMessage] = useState("");
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

  function updateItem(idx: number, key: string, value: string | number) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, [key]: value } : it)));
  }

  function addItem() {
    setItems((prev) => [...prev, { description: "", quantity: 1, unit: "unit", unit_price: 0 as number }]);
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
      // Convert string prices to numbers before sending
      const lineItems = items.map(item => ({
        ...item,
        unit_price: typeof item.unit_price === 'string' ? parseFloat(item.unit_price) || 0 : item.unit_price
      }));
      const body = {
        client_id: clientId,
        lead_id: leadId,
        lineItems,
        contract_message: contractMessage || null,
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
    (sum, it) => {
      const price = typeof it.unit_price === 'string' ? parseFloat(it.unit_price) || 0 : it.unit_price;
      return sum + Number(it.quantity || 0) * price;
    },
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
                <div className="col-span-6 space-y-2">
                  <MaterialSelector
                    value={materialIds[i]}
                    onSelect={(material) => {
                      if (material) {
                        // Pre-fill from material catalog
                        updateItem(i, "description", material.name);
                        updateItem(i, "unit", material.unit);
                        updateItem(i, "unit_price", material.default_price);
                        setMaterialIds(prev => ({ ...prev, [i]: material.id }));
                      } else {
                        // Custom entry - allow manual input
                        setMaterialIds(prev => {
                          const newIds = { ...prev };
                          delete newIds[i];
                          return newIds;
                        });
                        // Clear description if switching from material to custom
                        if (materialIds[i]) {
                          updateItem(i, "description", "");
                        }
                      }
                    }}
                    onCustomEntry={() => {
                      setMaterialIds(prev => {
                        const newIds = { ...prev };
                        delete newIds[i];
                        return newIds;
                      });
                    }}
                  />
                  {/* Always show description input - will be pre-filled if material selected, but can be edited */}
                  <Input
                    placeholder="Description (type manually or select from catalog above)"
                    value={it.description}
                    onChange={(e) => {
                      // Allow manual typing - always update description
                      updateItem(i, "description", e.target.value);
                    }}
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
                <div className="col-span-2">
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium pointer-events-none z-10">$</span>
                    <Input
                      type="text"
                      placeholder="0.00"
                      value={typeof it.unit_price === 'string' ? it.unit_price : (it.unit_price === 0 ? '' : it.unit_price.toString())}
                      onChange={(e) => {
                        const value = e.target.value;
                        // Allow empty, numbers, and decimals with max 2 decimal places (including partial like "10." or ".")
                        if (value === '' || /^\d*\.?\d{0,2}$/.test(value)) {
                          // If it's just "." or ends with ".", store as string to allow typing
                          if (value === '.' || (value.endsWith('.') && !value.includes('..'))) {
                            // Store as string temporarily while user is typing
                            updateItem(i, "unit_price", value);
                          } else if (value === '') {
                            updateItem(i, "unit_price", 0);
                          } else {
                            // Convert to number only when complete, round to 2 decimal places
                            const numValue = parseFloat(value);
                            if (!isNaN(numValue)) {
                              const rounded = Math.round(numValue * 100) / 100;
                              updateItem(i, "unit_price", rounded);
                            } else {
                              updateItem(i, "unit_price", 0);
                            }
                          }
                        }
                      }}
                      onBlur={(e) => {
                        // When user leaves the field, convert any partial decimal to number
                        const value = e.target.value;
                        if (value === '.' || value === '') {
                          updateItem(i, "unit_price", 0);
                        } else {
                          const numValue = parseFloat(value);
                          if (!isNaN(numValue) && numValue > 0) {
                            // Round to 2 decimal places
                            const rounded = Math.round(numValue * 100) / 100;
                            updateItem(i, "unit_price", rounded);
                          } else {
                            updateItem(i, "unit_price", 0);
                          }
                        }
                      }}
                      className="pl-7"
                    />
                  </div>
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
            <CardTitle>Contract Message (Optional)</CardTitle>
          </CardHeader>
          <CardContent>
            <Label htmlFor="contract-message" className="text-sm text-gray-600 mb-2 block">
              Add a custom message or terms to include in the estimate contract
            </Label>
            <Textarea
              id="contract-message"
              placeholder="e.g., Payment terms, warranty information, special conditions..."
              value={contractMessage}
              onChange={(e) => setContractMessage(e.target.value)}
              rows={4}
              className="w-full"
            />
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

export default function NewEstimatePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      </div>
    }>
      <NewEstimateContent />
    </Suspense>
  );
}


