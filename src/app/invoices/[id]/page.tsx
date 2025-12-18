'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { 
  LayoutDashboard, 
  Users, 
  FileText, 
  DollarSign,
  Calendar,
  BarChart3,
  Zap, 
  Settings, 
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  Plus,
  CheckCircle,
  Clock,
  AlertTriangle,
  Download,
  Edit,
  Trash2,
  Eye,
  FileText as FileTextIcon
} from 'lucide-react'
import UserProfile from '@/components/layout/user-profile'
import { NotificationBell } from '@/components/notifications/notification-bell'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ChevronDown } from 'lucide-react'
import SignOutButton from '@/components/auth/sign-out'

const sidebarItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
  { icon: Users, label: "Clients", href: "/clients" },
  { icon: FileText, label: "Estimates", href: "/estimates" },
  { icon: DollarSign, label: "Invoices", href: "/invoices", active: true },
  { icon: Calendar, label: "Calendar", href: "/calendar" },
  { icon: BarChart3, label: "Reports", href: "/reports" },
  { icon: Users, label: "Team", href: "/team" },
  { icon: Zap, label: "Automations", href: "/automations" },
  { icon: Settings, label: "Settings", href: "/settings" },
];

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
  job_id?: string;
  estimate_id?: string;
  total_paid?: number;
  remaining?: number;
  clients?: {
    name: string;
    email?: string;
    phone?: string;
    address?: string;
  };
  jobs?: {
    id: string;
    title: string;
    status: string;
    start_time: string;
    end_time: string;
  } | null;
  estimates?: {
    id: string;
    status: string;
    total: number;
    created_at: string;
  } | null;
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
  const [updating, setUpdating] = useState(false)
  const [sendingEmail, setSendingEmail] = useState(false)
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
    setUpdating(true)
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
      
      await fetchInvoice()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update invoice')
    } finally {
      setUpdating(false)
    }
  }

  const sendInvoiceEmail = async () => {
    if (!invoice?.clients?.email) {
      setError('Client email address is required')
      return
    }

    setSendingEmail(true)
    setError(null)

    try {
      const response = await fetch('/api/email/send-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceId: invoice.id,
          clientEmail: invoice.clients.email,
          clientName: invoice.clients.name || 'Client'
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to send email')
      }

      // Refresh invoice data to get updated status
      await fetchInvoice()
      alert('Invoice sent successfully!')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send email')
    } finally {
      setSendingEmail(false)
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Paid': return CheckCircle
      case 'Overdue': return AlertTriangle
      case 'Sent': return Mail
      default: return Clock
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

  const totalPaid = invoice.total_paid || 0
  const remaining = invoice.remaining || (invoice.total - totalPaid)

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col h-screen">
        <div className="p-6 flex-shrink-0">
          <Link href="/" className="text-xl font-bold text-blue-600">DyluxePro</Link>
        </div>
        
        <nav className="flex-1 px-4 overflow-y-auto min-h-0">
          <ul className="space-y-2">
            {sidebarItems.map((item) => (
              <li key={item.label}>
                <Link
                  href={item.href}
                  className={`flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                    item.active
                      ? "bg-blue-50 text-blue-700 border-r-2 border-blue-600"
                      : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                >
                  <item.icon className="h-5 w-5 mr-3" />
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex-shrink-0 mt-auto">
          <UserProfile />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/invoices">
                <Button variant="outline" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Invoices
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{invoice.invoice_number}</h1>
                <p className="text-gray-600">{invoice.clients?.name || 'Unknown Client'}</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <div className="text-2xl font-bold text-gray-900">${invoice.total.toLocaleString()}</div>
                <div className="text-sm text-gray-500">Total Amount</div>
              </div>
              <div className="flex items-center space-x-2">
                {(() => {
                  const StatusIcon = getStatusIcon(invoice.status)
                  return <StatusIcon className="h-5 w-5 text-gray-400" />
                })()}
                <span className={`px-4 py-2 rounded-full text-sm font-medium ${getStatusColor(invoice.status)}`}>
                  {invoice.status}
                </span>
              </div>
              <NotificationBell />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src="/placeholder-avatar.jpg" />
                      <AvatarFallback>JD</AvatarFallback>
                    </Avatar>
                    <ChevronDown className="h-4 w-4 ml-2" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link href="/profile">Profile</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/settings">Settings</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <SignOutButton />
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        {/* Invoice Content */}
        <main className="flex-1 p-6">
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Client Info */}
            <Card className="border-0 shadow-lg">
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
                          <span className={invoice.status === 'Overdue' ? 'text-red-600 font-semibold' : ''}>
                            {new Date(invoice.due_date).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total:</span>
                        <span className="font-semibold text-lg">${invoice.total.toLocaleString()}</span>
                      </div>
                      {totalPaid > 0 && (
                        <div className="flex justify-between pt-2 border-t">
                          <span className="text-gray-600">Paid:</span>
                          <span className="font-semibold text-green-600">${totalPaid.toLocaleString()}</span>
                        </div>
                      )}
                      {remaining > 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Remaining:</span>
                          <span className="font-semibold text-orange-600">${remaining.toLocaleString()}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Linked Estimate */}
            {invoice.estimate_id && invoice.estimates && (
              <Card className="border-0 shadow-lg border-l-4 border-l-blue-500">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center space-x-2">
                    <FileTextIcon className="h-5 w-5 text-blue-600" />
                    <span>Linked Estimate</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        Estimate #{invoice.estimates.id.slice(0, 8)}
                      </p>
                      <p className="text-sm text-gray-600 mt-1">
                        Total: ${invoice.estimates.total.toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Created: {new Date(invoice.estimates.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Link href={`/estimates/${invoice.estimate_id}`}>
                      <Button variant="outline" size="sm">
                        <FileTextIcon className="h-4 w-4 mr-2" />
                        View Estimate
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Linked Job */}
            {invoice.job_id && invoice.jobs && (
              <Card className="border-0 shadow-lg border-l-4 border-l-purple-500">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center space-x-2">
                    <Calendar className="h-5 w-5 text-purple-600" />
                    <span>Linked Job</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {invoice.jobs.title}
                      </p>
                      <p className="text-sm text-gray-600 mt-1">
                        Status: <span className="font-medium">{invoice.jobs.status}</span>
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Scheduled: {new Date(invoice.jobs.start_time).toLocaleDateString()} - {new Date(invoice.jobs.end_time).toLocaleDateString()}
                      </p>
                    </div>
                    <Link href={`/jobs/${invoice.job_id}`}>
                      <Button variant="outline" size="sm">
                        <Calendar className="h-4 w-4 mr-2" />
                        View Job
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Line Items */}
            {invoice.invoice_line_items && invoice.invoice_line_items.length > 0 && (
              <Card className="border-0 shadow-lg">
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
                  <div className="bg-gray-50 px-4 py-4 mt-4 rounded-lg">
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
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Payments</CardTitle>
                  {!showPaymentForm && remaining > 0 && (
                    <Button onClick={() => setShowPaymentForm(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Payment
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {/* Payment Progress */}
                {totalPaid > 0 && (
                  <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        {totalPaid >= invoice.total ? (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        ) : (
                          <Clock className="h-5 w-5 text-blue-600" />
                        )}
                        <span className="font-medium">
                          {totalPaid >= invoice.total ? 'Fully Paid' : 'Partially Paid'}
                        </span>
                      </div>
                      <span className="text-sm text-gray-600">
                        ${totalPaid.toLocaleString()} / ${invoice.total.toLocaleString()}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div 
                        className={`h-3 rounded-full transition-all ${
                          totalPaid >= invoice.total ? 'bg-green-600' : 'bg-blue-600'
                        }`}
                        style={{ width: `${Math.min((totalPaid / invoice.total) * 100, 100)}%` }}
                      />
                    </div>
                    {remaining > 0 && (
                      <p className="text-sm text-gray-600 mt-2">
                        Remaining: <span className="font-semibold">${remaining.toLocaleString()}</span>
                      </p>
                    )}
                  </div>
                )}

                {/* Add Payment Form */}
                {showPaymentForm && (
                  <div className="mb-6 p-4 bg-gray-50 rounded-lg border">
                    <h3 className="font-semibold mb-4">Add Payment</h3>
                    <form onSubmit={addPayment} className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm mb-1">Amount</label>
                          <div className="relative">
                            <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                            <Input 
                              type="number"
                              step="0.01"
                              value={paymentForm.amount}
                              onChange={(e) => setPaymentForm(prev => ({ ...prev, amount: e.target.value }))}
                              placeholder="0.00"
                              className="pl-10"
                              required 
                              max={remaining}
                            />
                          </div>
                          <p className="text-xs text-gray-500 mt-1">Max: ${remaining.toLocaleString()}</p>
                        </div>
                        <div>
                          <label className="block text-sm mb-1">Payment Method</label>
                          <Select 
                            value={paymentForm.payment_method}
                            onValueChange={(value) => setPaymentForm(prev => ({ ...prev, payment_method: value }))}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Cash">Cash</SelectItem>
                              <SelectItem value="Check">Check</SelectItem>
                              <SelectItem value="Credit Card">Credit Card</SelectItem>
                              <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                            </SelectContent>
                          </Select>
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
                          rows={3}
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

                {/* Payment History */}
                {invoice.payments && invoice.payments.length > 0 ? (
                  <div className="space-y-3">
                    <h4 className="font-semibold text-gray-900">Payment History</h4>
                    {invoice.payments.map((payment) => (
                      <div key={payment.id} className="flex items-center justify-between p-4 bg-white border rounded-lg hover:shadow-md transition-shadow">
                        <div className="flex items-center space-x-4">
                          <div className="p-2 bg-green-100 rounded-lg">
                            <CheckCircle className="h-5 w-5 text-green-600" />
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900">${payment.amount.toLocaleString()}</div>
                            <div className="text-sm text-gray-600">{payment.payment_method}</div>
                            {payment.reference && (
                              <div className="text-xs text-gray-500">Ref: {payment.reference}</div>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium text-gray-900">{new Date(payment.payment_date).toLocaleDateString()}</div>
                          {payment.notes && (
                            <div className="text-xs text-gray-500 mt-1 max-w-xs">{payment.notes}</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <DollarSign className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                    <p>No payments recorded yet</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle>Actions</CardTitle>
              </CardHeader>
              <CardContent>
                {error && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                )}
                <div className="flex flex-wrap gap-3">
                  <Button variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Download PDF
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    onClick={sendInvoiceEmail}
                    disabled={!invoice.clients?.email || sendingEmail || updating}
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    {sendingEmail ? 'Sending...' : 'Email to Client'}
                  </Button>

                  {invoice.status === 'Draft' && (
                    <Button onClick={() => updateInvoiceStatus('Sent')} disabled={updating}>
                      <Mail className="h-4 w-4 mr-2" />
                      Send Invoice
                    </Button>
                  )}

                  {invoice.status === 'Sent' && remaining > 0 && (
                    <Button onClick={() => updateInvoiceStatus('Paid')} disabled={updating} className="bg-green-600 hover:bg-green-700">
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Mark as Paid
                    </Button>
                  )}

                  {invoice.status === 'Sent' && (
                    <Button variant="destructive" onClick={() => updateInvoiceStatus('Cancelled')} disabled={updating}>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Cancel Invoice
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  )
}
