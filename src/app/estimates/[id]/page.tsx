'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  LayoutDashboard, 
  Users, 
  FileText, 
  Zap, 
  Settings, 
  ArrowLeft,
  Download,
  Mail,
  Check,
  Calendar,
  Clock,
  Phone,
  MapPin,
  DollarSign,
  X
} from 'lucide-react'

interface Estimate {
  id: string;
  client_id: string;
  lead_id?: string;
  status: 'Draft' | 'Sent' | 'Approved' | 'Rejected' | 'Scheduled' | 'Completed';
  subtotal: number;
  tax: number;
  total: number;
  created_at: string;
  updated_at: string;
  clients?: {
    name: string;
    email?: string;
    phone?: string;
    address?: string;
  };
  estimate_line_items?: Array<{
    id: string;
    description: string;
    quantity: number;
    unit: string;
    unit_price: number;
    total: number;
  }>;
}

const sidebarItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
  { icon: Users, label: "Clients", href: "/clients" },
  { icon: FileText, label: "Estimates", href: "/estimates" },
  { icon: Zap, label: "Automations", href: "/automations" },
  { icon: Settings, label: "Settings", href: "/settings" },
];

export default function EstimateDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [estimate, setEstimate] = useState<Estimate | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    if (params.id) {
      fetchEstimate()
    }
  }, [params.id])

  const fetchEstimate = async () => {
    try {
      const response = await fetch(`/api/estimates/${params.id}`)
      if (!response.ok) {
        throw new Error('Failed to fetch estimate')
      }
      const data = await response.json()
      setEstimate(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const updateEstimateStatus = async (newStatus: string) => {
    try {
      setUpdating(true)
      const response = await fetch(`/api/estimates/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })
      
      if (!response.ok) {
        throw new Error('Failed to update estimate')
      }
      
      const updated = await response.json()
      setEstimate(updated)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update estimate')
    } finally {
      setUpdating(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Draft': return 'bg-gray-100 text-gray-800'
      case 'Sent': return 'bg-blue-100 text-blue-800'
      case 'Approved': return 'bg-green-100 text-green-800'
      case 'Rejected': return 'bg-red-100 text-red-800'
      case 'Scheduled': return 'bg-purple-100 text-purple-800'
      case 'Completed': return 'bg-emerald-100 text-emerald-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading estimate...</p>
        </div>
      </div>
    )
  }

  if (error || !estimate) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Error: {error || 'Estimate not found'}</p>
          <Link href="/estimates">
            <Button>Back to Estimates</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-6">
          <Link href="/" className="text-xl font-bold text-blue-600">DyluxePro</Link>
        </div>
        
        <nav className="flex-1 px-4">
          <ul className="space-y-2">
            {sidebarItems.map((item) => (
              <li key={item.label}>
                <Link
                  href={item.href}
                  className={`flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                    item.label === "Estimates"
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
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/estimates">
                <Button variant="outline" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Estimates
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Estimate #{estimate.id.slice(0, 8)}</h1>
                <p className="text-gray-600">{estimate.clients?.name || 'Unknown Client'}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(estimate.status)}`}>
                {estimate.status}
              </span>
            </div>
          </div>
        </header>

        {/* Estimate Content */}
        <main className="flex-1 p-6">
          <div className="max-w-4xl mx-auto space-y-6">
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
                      <div className="font-medium">{estimate.clients?.name || 'Unknown Client'}</div>
                      {estimate.clients?.email && (
                        <div className="flex items-center text-gray-600">
                          <Mail className="h-4 w-4 mr-2" />
                          {estimate.clients.email}
                        </div>
                      )}
                      {estimate.clients?.phone && (
                        <div className="flex items-center text-gray-600">
                          <Phone className="h-4 w-4 mr-2" />
                          {estimate.clients.phone}
                        </div>
                      )}
                      {estimate.clients?.address && (
                        <div className="flex items-start text-gray-600">
                          <MapPin className="h-4 w-4 mr-2 mt-0.5" />
                          {estimate.clients.address}
                        </div>
                      )}
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3">Estimate Details</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Created:</span>
                        <span>{new Date(estimate.created_at).toLocaleDateString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Updated:</span>
                        <span>{new Date(estimate.updated_at).toLocaleDateString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total:</span>
                        <span className="font-semibold text-lg">${estimate.total.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Line Items */}
            {estimate.estimate_line_items && estimate.estimate_line_items.length > 0 && (
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
                        {estimate.estimate_line_items.map((item) => (
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
                          <span className="font-medium">${estimate.subtotal.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Tax (7%):</span>
                          <span className="font-medium">${estimate.tax.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-lg font-semibold border-t border-gray-300 pt-2">
                          <span>Total:</span>
                          <span className="text-blue-600">${estimate.total.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Action Buttons */}
            <Card>
              <CardHeader>
                <CardTitle>Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-3">
                  <Button variant="outline" disabled={updating}>
                    <Download className="h-4 w-4 mr-2" />
                    Download PDF
                  </Button>
                  
                  <Button variant="outline" disabled={updating}>
                    <Mail className="h-4 w-4 mr-2" />
                    Email to Client
                  </Button>

                  {estimate.status === 'Sent' && (
                    <Button 
                      onClick={() => updateEstimateStatus('Approved')}
                      disabled={updating}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Check className="h-4 w-4 mr-2" />
                      Mark as Approved
                    </Button>
                  )}

                  {estimate.status === 'Approved' && (
                    <Button 
                      onClick={() => updateEstimateStatus('Scheduled')}
                      disabled={updating}
                      className="bg-purple-600 hover:bg-purple-700"
                    >
                      <Calendar className="h-4 w-4 mr-2" />
                      Schedule Job
                    </Button>
                  )}

                  {estimate.status === 'Scheduled' && (
                    <Button 
                      onClick={() => updateEstimateStatus('Completed')}
                      disabled={updating}
                      className="bg-emerald-600 hover:bg-emerald-700"
                    >
                      <Clock className="h-4 w-4 mr-2" />
                      Mark Complete
                    </Button>
                  )}

                  {estimate.status === 'Sent' && (
                    <Button 
                      onClick={() => updateEstimateStatus('Rejected')}
                      disabled={updating}
                      variant="destructive"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Mark as Rejected
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
