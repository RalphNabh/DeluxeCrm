'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { ArrowLeft, Plus, Trash2, DollarSign, CreditCard, Mail } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

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
  unit_price: number | string;
  total: number;
}

function CreateInvoiceContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const estimateId = searchParams.get('estimateId')
  const jobId = searchParams.get('jobId')
  const clientId = searchParams.get('clientId')
  
  const [clients, setClients] = useState<Client[]>([])
  const [estimates, setEstimates] = useState<Estimate[]>([])
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [selectedEstimate, setSelectedEstimate] = useState<Estimate | null>(null)
  const [lineItems, setLineItems] = useState<LineItem[]>([])
  const [userEmail, setUserEmail] = useState<string>('')
  const [form, setForm] = useState({
    client_id: clientId || '',
    estimate_id: estimateId || '',
    job_id: jobId || '',
    due_date: '',
    notes: '',
    payment_method: '',
    payment_email: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchClients()
    fetchUserEmail()
    if (estimateId) {
      fetchEstimates()
    }
  }, [estimateId])

  const fetchUserEmail = async () => {
    try {
      const response = await fetch('/api/user/profile')
      if (response.ok) {
        const data = await response.json()
        setUserEmail(data.email || '')
      }
    } catch (err) {
      console.error('Failed to fetch user email:', err)
    }
  }

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
      unit_price: 0 as number,
      total: 0
    }])
  }

  const updateLineItem = (index: number, field: keyof LineItem, value: string | number) => {
    const updated = [...lineItems]
    updated[index] = { ...updated[index], [field]: value }
    
    if (field === 'quantity' || field === 'unit_price') {
      const price = typeof updated[index].unit_price === 'string' 
        ? parseFloat(updated[index].unit_price) || 0 
        : updated[index].unit_price;
      updated[index].total = Number(updated[index].quantity) * price;
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
      // Convert string prices to numbers before sending
      const processedLineItems = lineItems.map(item => ({
        ...item,
        unit_price: typeof item.unit_price === 'string' ? parseFloat(item.unit_price) || 0 : item.unit_price
      }));
      
      // Build notes with payment information
      let notesWithPayment = form.notes || ''
      if (form.payment_method) {
        const paymentInfo = `\n\nPayment Method: ${form.payment_method}${form.payment_email ? `\nPayment Email: ${form.payment_email}` : ''}`
        notesWithPayment = notesWithPayment ? notesWithPayment + paymentInfo : paymentInfo.trim()
      }

      const response = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: form.client_id,
          estimate_id: form.estimate_id && form.estimate_id !== 'none' ? form.estimate_id : null,
          job_id: form.job_id || null,
          lineItems: processedLineItems,
          due_date: form.due_date || null,
          notes: notesWithPayment || null,
          payment_method: form.payment_method || null,
          payment_email: form.payment_email || null
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
                <Select
                  value={form.client_id}
                  onValueChange={(value) => setForm(prev => ({ ...prev, client_id: value }))}
                  required
                >
                  <SelectTrigger className="w-full h-12">
                    <SelectValue placeholder="Select a client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map(client => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                <Select
                  value={form.estimate_id || undefined}
                  onValueChange={(value) => setForm(prev => ({ ...prev, estimate_id: value || '' }))}
                >
                  <SelectTrigger className="w-full h-12">
                    <SelectValue placeholder="No estimate" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No estimate</SelectItem>
                    {estimates.filter(e => e.client_id === form.client_id).map(estimate => (
                      <SelectItem key={estimate.id} value={estimate.id}>
                        #{estimate.id.slice(0, 8)} - ${estimate.total.toLocaleString()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                  <label className="block text-sm font-medium mb-2">Payment Method</label>
                  <Select
                    value={form.payment_method}
                    onValueChange={(value) => setForm(prev => ({ ...prev, payment_method: value, payment_email: value !== 'Email Transfer' && value !== 'Bank Transfer' ? '' : prev.payment_email }))}
                  >
                    <SelectTrigger className="w-full h-12">
                      <SelectValue placeholder="Select payment method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Cash">Cash</SelectItem>
                      <SelectItem value="Check">Check</SelectItem>
                      <SelectItem value="Credit Card">Credit Card</SelectItem>
                      <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                      <SelectItem value="Email Transfer">Email Transfer</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Payment Email Field - shown only for Email Transfer or Bank Transfer */}
              {(form.payment_method === 'Email Transfer' || form.payment_method === 'Bank Transfer') && (
                <div>
                  <label className="block text-sm font-medium mb-2">
                    {form.payment_method === 'Email Transfer' ? 'Email Address for Transfer' : 'Bank Email Address'}
                  </label>
                  
                  {/* User Email Dropdown */}
                  {userEmail && (
                    <div className="mb-2">
                      <Select
                        value={form.payment_email === userEmail ? userEmail : undefined}
                        onValueChange={(value) => {
                          setForm(prev => ({ ...prev, payment_email: value }))
                        }}
                      >
                        <SelectTrigger className="w-full h-10 bg-gray-50">
                          <SelectValue placeholder="Select your email address" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={userEmail}>{userEmail}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      type="email"
                      value={form.payment_email}
                      onChange={(e) => setForm(prev => ({ ...prev, payment_email: e.target.value }))}
                      placeholder="Or enter email address manually"
                      className="pl-10"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    This email will be included in the invoice email to the client.
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-2">Notes</label>
                <Textarea
                  value={form.notes}
                  onChange={(e) => setForm(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Additional notes..."
                  rows={3}
                />
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
                  No line items added yet. Click &quot;Add Item&quot; to get started.
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
                            value={typeof item.unit_price === 'string' ? item.unit_price : (item.unit_price === 0 ? '' : item.unit_price.toString())}
                            onChange={(e) => {
                              const value = e.target.value;
                              // Allow empty, numbers, and decimals with max 2 decimal places (including partial like "10." or ".")
                              if (value === '' || /^\d*\.?\d{0,2}$/.test(value)) {
                                // If it's just "." or ends with ".", store as string to allow typing
                                if (value === '.' || (value.endsWith('.') && !value.includes('..'))) {
                                  // Store as string temporarily while user is typing
                                  updateLineItem(index, 'unit_price', value);
                                } else if (value === '') {
                                  updateLineItem(index, 'unit_price', 0);
                                } else {
                                  // Convert to number only when complete, round to 2 decimal places
                                  const numValue = parseFloat(value);
                                  if (!isNaN(numValue)) {
                                    const rounded = Math.round(numValue * 100) / 100;
                                    updateLineItem(index, 'unit_price', rounded);
                                  } else {
                                    updateLineItem(index, 'unit_price', 0);
                                  }
                                }
                              }
                            }}
                            onBlur={(e) => {
                              // When user leaves the field, convert any partial decimal to number
                              const value = e.target.value;
                              if (value === '.' || value === '') {
                                updateLineItem(index, 'unit_price', 0);
                              } else {
                                const numValue = parseFloat(value);
                                if (!isNaN(numValue)) {
                                  // Round to 2 decimal places
                                  const rounded = Math.round(numValue * 100) / 100;
                                  updateLineItem(index, 'unit_price', rounded);
                                } else {
                                  updateLineItem(index, 'unit_price', 0);
                                }
                              }
                            }}
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

export default function CreateInvoicePage() {
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
      <CreateInvoiceContent />
    </Suspense>
  );
}
