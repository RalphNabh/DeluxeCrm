'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { ArrowLeft, Plus, Trash2, DollarSign } from 'lucide-react'

interface Client {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
}

interface Estimate {
  id: string;
  client_id: string;
  subtotal: number;
  tax: number;
  total: number;
  estimate_line_items?: Array<{
    description: string;
    quantity: number;
    unit: string;
    unit_price: number;
    total: number;
  }>;
}

interface LineItem {
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  total: number;
}

export default function CreateInvoicePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const estimateId = searchParams.get('estimateId')
  const clientId = searchParams.get('clientId')
  
  const [clients, setClients] = useState<Client[]>([])
  const [estimates, setEstimates] = useState<Estimate[]>([])
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [selectedEstimate, setSelectedEstimate] = useState<Estimate | null>(null)
  const [lineItems, setLineItems] = useState<LineItem[]>([])
  const [form, setForm] = useState({
    client_id: clientId || '',
    estimate_id: estimateId || '',
    due_date: '',
    notes: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchClients()
    if (estimateId) {
      fetchEstimates()
    }
  }, [estimateId])

  useEffect(() => {
    if (form.client_id) {
      const client = clients.find(c => c.id === form.client_id)
      setSelectedClient(client || null)
    }
  }, [form.client_id, clients])

  useEffect(() => {
    if (form.estimate_id && estimates.length > 0) {
      const estimate = estimates.find(e => e.id === form.estimate_id)
      setSelectedEstimate(estimate || null)
      if (estimate?.estimate_line_items) {
        setLineItems(estimate.estimate_line_items)
      }
    }
  }, [form.estimate_id, estimates])

  const fetchClients = async () => {
    try {
      const response = await fetch('/api/clients')
      if (!response.ok) throw new Error('Failed to fetch clients')
      const data = await response.json()
      setClients(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch clients')
    }
  }

  const fetchEstimates = async () => {
    try {
      const response = await fetch('/api/estimates')
      if (!response.ok) throw new Error('Failed to fetch estimates')
      const data = await response.json()
      setEstimates(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch estimates')
    }
  }

  const addLineItem = () => {
    setLineItems([...lineItems, {
      description: '',
      quantity: 1,
      unit: 'unit',
      unit_price: 0,
      total: 0
    }])
  }

  const updateLineItem = (index: number, field: keyof LineItem, value: string | number) => {
    const updated = [...lineItems]
    updated[index] = { ...updated[index], [field]: value }
    
    if (field === 'quantity' || field === 'unit_price') {
      updated[index].total = Number(updated[index].quantity) * Number(updated[index].unit_price)
    }
    
    setLineItems(updated)
  }

  const removeLineItem = (index: number) => {
    setLineItems(lineItems.filter((_, i) => i !== index))
  }

  const calculateTotals = () => {
    const subtotal = lineItems.reduce((sum, item) => sum + item.total, 0)
    const tax = Math.round(subtotal * 0.13 * 100) / 100
    const total = subtotal + tax
    return { subtotal, tax, total }
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.client_id) {
      setError('Please select a client')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: form.client_id,
          estimate_id: form.estimate_id || null,
          lineItems,
          due_date: form.due_date || null,
          notes: form.notes || null
        })
      })

      if (!response.ok) {
        throw new Error('Failed to create invoice')
      }

      const invoice = await response.json()
      router.push(`/invoices/${invoice.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create invoice')
    } finally {
      setLoading(false)
    }
  }

  const { subtotal, tax, total } = calculateTotals()

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <Link href="/invoices">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Invoices
              </Button>
            </Link>
            <h1 className="text-2xl font-bold">Create Invoice</h1>
          </div>
        </div>

        <form onSubmit={onSubmit} className="space-y-6">
          {/* Client and Estimate Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Invoice Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Client *</label>
                <div className="relative">
                  <select
                    value={form.client_id}
                    onChange={(e) => setForm(prev => ({ ...prev, client_id: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    required
                  >
                    <option value="">Select a client</option>
                    {clients.map(client => (
                      <option key={client.id} value={client.id}>{client.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {selectedClient && (
                <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-blue-100 rounded-full">
                      <DollarSign className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900">{selectedClient.name}</div>
                      {selectedClient.email && <div className="text-sm text-gray-600">{selectedClient.email}</div>}
                      {selectedClient.phone && <div className="text-sm text-gray-600">{selectedClient.phone}</div>}
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Estimate (Optional)</label>
                <div className="relative">
                  <select
                    value={form.estimate_id}
                    onChange={(e) => setForm(prev => ({ ...prev, estimate_id: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  >
                    <option value="">No estimate</option>
                    {estimates.filter(e => e.client_id === form.client_id).map(estimate => (
                      <option key={estimate.id} value={estimate.id}>
                        #{estimate.id.slice(0, 8)} - ${estimate.total.toLocaleString()}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Due Date</label>
                  <Input
                    type="date"
                    value={form.due_date}
                    onChange={(e) => setForm(prev => ({ ...prev, due_date: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Notes</label>
                  <Textarea
                    value={form.notes}
                    onChange={(e) => setForm(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Additional notes..."
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Line Items */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Line Items</CardTitle>
                <Button type="button" onClick={addLineItem}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Item
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {lineItems.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No line items added yet. Click "Add Item" to get started.
                </div>
              ) : (
                <div className="space-y-4">
                  {lineItems.map((item, index) => (
                    <div key={index} className="grid grid-cols-12 gap-4 items-end">
                      <div className="col-span-5">
                        <label className="block text-sm font-medium mb-1">Description</label>
                        <Input
                          value={item.description}
                          onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                          placeholder="Item description"
                          required
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-sm font-medium mb-1">Quantity</label>
                        <Input
                          type="text"
                          value={item.quantity}
                          onChange={(e) => updateLineItem(index, 'quantity', Number(e.target.value))}
                          placeholder="1"
                          required
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-sm font-medium mb-1">Unit</label>
                        <Input
                          type="text"
                          value={item.unit}
                          onChange={(e) => updateLineItem(index, 'unit', e.target.value)}
                          placeholder="unit"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-sm font-medium mb-1">Unit Price</label>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                          <Input
                            type="text"
                            value={item.unit_price}
                            onChange={(e) => updateLineItem(index, 'unit_price', Number(e.target.value))}
                            placeholder="0.00"
                            className="pl-10"
                            required
                          />
                        </div>
                      </div>
                      <div className="col-span-1 flex items-end">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeLineItem(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Totals */}
          <Card>
            <CardHeader>
              <CardTitle>Invoice Totals</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>${subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tax (13%):</span>
                  <span>${tax.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-lg font-semibold border-t border-gray-300 pt-2">
                  <span>Total:</span>
                  <span className="text-blue-600">${total.toLocaleString()}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Error Message */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600">{error}</p>
            </div>
          )}

          {/* Submit Button */}
          <div className="flex justify-end space-x-4">
            <Link href="/invoices">
              <Button type="button" variant="outline">Cancel</Button>
            </Link>
            <Button type="submit" disabled={loading || lineItems.length === 0}>
              {loading ? 'Creating...' : 'Create Invoice'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
