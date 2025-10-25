'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { 
  ArrowLeft,
  DollarSign,
  Mail,
  Phone,
  MapPin,
  Plus,
  CheckCircle,
  Clock,
  AlertTriangle,
  Download,
  Edit,
  Trash2
} from 'lucide-react'
import PaymentTracker from '@/components/payments/payment-tracker'

interface Invoice {
  id: string;
  invoice_number: string;
  client_id: string;
  status: 'Draft' | 'Sent' | 'Paid' | 'Overdue' | 'Cancelled';
  subtotal: number;
  tax: number;
  total: number;
  due_date?: string;
  sent_at?: string;
  paid_at?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  clients?: {
    name: string;
    email?: string;
    phone?: string;
    address?: string;
  };
  invoice_line_items?: Array<{
    id: string;
    description: string;
    quantity: number;
    unit: string;
    unit_price: number;
    total: number;
  }>;
  payments?: Array<{
    id: string;
    amount: number;
    payment_method: string;
    payment_date: string;
    reference?: string;
    notes?: string;
  }>;
}

export default function InvoiceDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showPaymentForm, setShowPaymentForm] = useState(false)
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    payment_method: 'Cash',
    payment_date: new Date().toISOString().split('T')[0],
    reference: '',
    notes: ''
  })

  useEffect(() => {
    if (params.id) {
      fetchInvoice()
    }
  }, [params.id])

  const fetchInvoice = async () => {
    try {
      const response = await fetch(`/api/invoices/${params.id}`)
      if (!response.ok) {
        throw new Error('Failed to fetch invoice')
      }
      const data = await response.json()
      setInvoice(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const updateInvoiceStatus = async (newStatus: string) => {
    try {
      const response = await fetch(`/api/invoices/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: newStatus,
          sent_at: newStatus === 'Sent' ? new Date().toISOString() : null,
          paid_at: newStatus === 'Paid' ? new Date().toISOString() : null
        })
      })
      
      if (!response.ok) {
        throw new Error('Failed to update invoice')
      }
      
      const updated = await response.json()
      setInvoice(updated)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update invoice')
    }
  }

  const addPayment = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const response = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoice_id: params.id,
          amount: Number(paymentForm.amount),
          payment_method: paymentForm.payment_method,
          payment_date: paymentForm.payment_date,
          reference: paymentForm.reference,
          notes: paymentForm.notes
        })
      })
      
      if (!response.ok) {
        throw new Error('Failed to add payment')
      }
      
      // Refresh invoice data
      await fetchInvoice()
      setShowPaymentForm(false)
      setPaymentForm({
        amount: '',
        payment_method: 'Cash',
        payment_date: new Date().toISOString().split('T')[0],
        reference: '',
        notes: ''
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add payment')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Draft': return 'bg-gray-100 text-gray-800'
      case 'Sent': return 'bg-blue-100 text-blue-800'
      case 'Paid': return 'bg-green-100 text-green-800'
      case 'Overdue': return 'bg-red-100 text-red-800'
      case 'Cancelled': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading invoice...</p>
        </div>
      </div>
    )
  }

  if (error || !invoice) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Error: {error || 'Invoice not found'}</p>
          <Link href="/invoices">
            <Button>Back to Invoices</Button>
          </Link>
        </div>
      </div>
    )
  }

  const totalPaid = invoice.payments?.reduce((sum, p) => sum + p.amount, 0) || 0
  const remaining = invoice.total - totalPaid

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/invoices">
              <Button variant="outline" size="sm" className="hover:bg-gray-50">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Invoices
              </Button>
            </Link>
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <DollarSign className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{invoice.invoice_number}</h1>
                <p className="text-gray-600 text-lg">{invoice.clients?.name || 'Unknown Client'}</p>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <div className="text-right">
              <div className="text-2xl font-bold text-gray-900">${invoice.total.toLocaleString()}</div>
              <div className="text-sm text-gray-500">Total Amount</div>
            </div>
            <div className="flex items-center space-x-2">
              <span className={`px-4 py-2 rounded-full text-sm font-medium ${getStatusColor(invoice.status)}`}>
                {invoice.status}
              </span>
            </div>
          </div>
        </div>

        {/* Client Info */}
        <Card>
          <CardHeader>
            <CardTitle>Client Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Client Details</h3>
                <div className="space-y-2 text-sm">
                  <div className="font-medium">{invoice.clients?.name || 'Unknown Client'}</div>
                  {invoice.clients?.email && (
                    <div className="flex items-center text-gray-600">
                      <Mail className="h-4 w-4 mr-2" />
                      {invoice.clients.email}
                    </div>
                  )}
                  {invoice.clients?.phone && (
                    <div className="flex items-center text-gray-600">
                      <Phone className="h-4 w-4 mr-2" />
                      {invoice.clients.phone}
                    </div>
                  )}
                  {invoice.clients?.address && (
                    <div className="flex items-start text-gray-600">
                      <MapPin className="h-4 w-4 mr-2 mt-0.5" />
                      {invoice.clients.address}
                    </div>
                  )}
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Invoice Details</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Created:</span>
                    <span>{new Date(invoice.created_at).toLocaleDateString()}</span>
                  </div>
                  {invoice.due_date && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Due Date:</span>
                      <span>{new Date(invoice.due_date).toLocaleDateString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total:</span>
                    <span className="font-semibold text-lg">${invoice.total.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Line Items */}
        {invoice.invoice_line_items && invoice.invoice_line_items.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Line Items</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Description</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-900">Quantity</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-900">Unit Price</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-900">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {invoice.invoice_line_items.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm">
                          <div className="font-medium text-gray-900">{item.description}</div>
                        </td>
                        <td className="px-4 py-3 text-sm text-right text-gray-600">
                          {item.quantity.toLocaleString()} {item.unit}
                        </td>
                        <td className="px-4 py-3 text-sm text-right text-gray-600">
                          ${item.unit_price.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">
                          ${item.total.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals */}
              <div className="bg-gray-50 px-4 py-4 mt-4">
                <div className="flex justify-end">
                  <div className="w-64 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Subtotal:</span>
                      <span className="font-medium">${invoice.subtotal.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Tax (13%):</span>
                      <span className="font-medium">${invoice.tax.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-lg font-semibold border-t border-gray-300 pt-2">
                      <span>Total:</span>
                      <span className="text-blue-600">${invoice.total.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Payments */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Payments</CardTitle>
              <Button onClick={() => setShowPaymentForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Payment
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {showPaymentForm && (
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h3 className="font-semibold mb-4">Add Payment</h3>
                <form onSubmit={addPayment} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm mb-1">Amount</label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <Input 
                          type="text"
                          value={paymentForm.amount}
                          onChange={(e) => setPaymentForm(prev => ({ ...prev, amount: e.target.value }))}
                          placeholder="0.00"
                          className="pl-10"
                          required 
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm mb-1">Payment Method</label>
                      <select 
                        value={paymentForm.payment_method}
                        onChange={(e) => setPaymentForm(prev => ({ ...prev, payment_method: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      >
                        <option value="Cash">Cash</option>
                        <option value="Check">Check</option>
                        <option value="Credit Card">Credit Card</option>
                        <option value="Bank Transfer">Bank Transfer</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm mb-1">Payment Date</label>
                      <Input 
                        type="date"
                        value={paymentForm.payment_date}
                        onChange={(e) => setPaymentForm(prev => ({ ...prev, payment_date: e.target.value }))}
                        required 
                      />
                    </div>
                    <div>
                      <label className="block text-sm mb-1">Reference</label>
                      <Input 
                        value={paymentForm.reference}
                        onChange={(e) => setPaymentForm(prev => ({ ...prev, reference: e.target.value }))}
                        placeholder="Check number, transaction ID, etc."
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm mb-1">Notes</label>
                    <Textarea 
                      value={paymentForm.notes}
                      onChange={(e) => setPaymentForm(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder="Additional notes..."
                    />
                  </div>
                  <div className="flex space-x-2">
                    <Button type="submit">Add Payment</Button>
                    <Button type="button" variant="outline" onClick={() => setShowPaymentForm(false)}>
                      Cancel
                    </Button>
                  </div>
                </form>
              </div>
            )}

            {/* Enhanced Payment Tracker */}
            <PaymentTracker 
              invoiceId={invoice.id}
              totalAmount={invoice.total}
              onPaymentAdded={(payment) => {
                // Refresh invoice data
                fetchInvoice();
              }}
            />

            {/* Payment History */}
            {invoice.payments && invoice.payments.length > 0 ? (
              <div className="space-y-3">
                {invoice.payments.map((payment) => (
                  <div key={payment.id} className="flex items-center justify-between p-3 bg-white border rounded-lg">
                    <div>
                      <div className="font-medium">${payment.amount.toLocaleString()}</div>
                      <div className="text-sm text-gray-600">{payment.payment_method}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-600">{new Date(payment.payment_date).toLocaleDateString()}</div>
                      {payment.reference && (
                        <div className="text-xs text-gray-500">Ref: {payment.reference}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                No payments recorded yet
              </div>
            )}
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <Card>
          <CardHeader>
            <CardTitle>Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Download PDF
              </Button>
              
              <Button variant="outline">
                <Mail className="h-4 w-4 mr-2" />
                Email to Client
              </Button>

              {invoice.status === 'Draft' && (
                <Button onClick={() => updateInvoiceStatus('Sent')}>
                  <Mail className="h-4 w-4 mr-2" />
                  Send Invoice
                </Button>
              )}

              {invoice.status === 'Sent' && remaining > 0 && (
                <Button onClick={() => updateInvoiceStatus('Paid')}>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Mark as Paid
                </Button>
              )}

              {invoice.status === 'Sent' && (
                <Button variant="destructive" onClick={() => updateInvoiceStatus('Cancelled')}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Cancel Invoice
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
