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
  DollarSign,
  Calendar,
  BarChart3,
  Zap, 
  Settings, 
  ArrowLeft,
  Download,
  Mail,
  Check,
  Clock,
  Phone,
  MapPin,
  X,
  Plus,
  Eye
} from 'lucide-react'
import JobCreationModal from '@/components/jobs/job-creation-modal'
import UserProfile from '@/components/layout/user-profile'
import { formatCurrencyWithSymbol } from '@/lib/utils/currency'

interface Estimate {
  id: string;
  client_id: string;
  lead_id?: string;
  status: 'Draft' | 'Sent' | 'Approved' | 'Rejected' | 'Scheduled' | 'Completed';
  subtotal: number;
  tax: number;
  total: number;
  contract_message?: string;
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

interface LinkedJob {
  id: string;
  title: string;
  status: string;
  start_time: string;
  end_time: string;
}

const sidebarItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
  { icon: Users, label: "Clients", href: "/clients" },
  { icon: FileText, label: "Estimates", href: "/estimates", active: true },
  { icon: DollarSign, label: "Invoices", href: "/invoices" },
  { icon: Calendar, label: "Calendar", href: "/calendar" },
  { icon: BarChart3, label: "Reports", href: "/reports" },
  { icon: Users, label: "Team", href: "/team" },
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
  const [sendingEmail, setSendingEmail] = useState(false)
  const [showCreateJobModal, setShowCreateJobModal] = useState(false)
  const [linkedJobs, setLinkedJobs] = useState<LinkedJob[]>([])

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
      
      // Fetch linked jobs if estimate_id column exists
      try {
        const jobsResponse = await fetch('/api/jobs')
        if (jobsResponse.ok) {
          const jobs = await jobsResponse.json()
          // Filter jobs that have this estimate_id (if column exists)
          const linked = jobs.filter((job: Record<string, unknown>) => 
            job.estimate_id === data.id
          )
          setLinkedJobs(linked)
        }
      } catch (e) {
        // Column may not exist yet, ignore
        console.log('Could not fetch linked jobs:', e)
      }
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

  const sendEstimateEmail = async () => {
    if (!estimate?.clients?.email) {
      setError('Client email not found')
      return
    }

    setSendingEmail(true)
    setError(null)

    try {
      const response = await fetch('/api/email/send-estimate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          estimateId: estimate.id,
          clientEmail: estimate.clients.email,
          clientName: estimate.clients.name
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to send email' }))
        throw new Error(errorData.error || 'Failed to send email')
      }

      const result = await response.json()
      
      // Refresh estimate data to get updated status
      await fetchEstimate()
      
      alert('Estimate sent successfully!')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send email')
    } finally {
      setSendingEmail(false)
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
                        <span className="font-semibold text-lg">{formatCurrencyWithSymbol(estimate.total)}</span>
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
                            <td className="px-4 py-3 text-sm text-right text-gray-600 whitespace-nowrap">
                              {formatCurrencyWithSymbol(item.unit_price)}
                            </td>
                            <td className="px-4 py-3 text-sm text-right font-medium text-gray-900 whitespace-nowrap">
                              {formatCurrencyWithSymbol(item.total)}
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
                          <span className="font-medium">{formatCurrencyWithSymbol(estimate.subtotal)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Tax (13%):</span>
                          <span className="font-medium">{formatCurrencyWithSymbol(estimate.tax)}</span>
                        </div>
                        <div className="flex justify-between text-lg font-semibold border-t border-gray-300 pt-2">
                          <span>Total:</span>
                          <span className="text-blue-600">{formatCurrencyWithSymbol(estimate.total)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Contract Message */}
            {estimate.contract_message && (
              <Card>
                <CardHeader>
                  <CardTitle>Contract Terms & Conditions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="prose max-w-none">
                    <p className="text-gray-700 whitespace-pre-wrap">{estimate.contract_message}</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Linked Jobs */}
            {linkedJobs.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Calendar className="h-5 w-5 mr-2" />
                    Linked Jobs
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {linkedJobs.map((job) => (
                      <div key={job.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <div className="font-medium text-gray-900">{job.title}</div>
                          <div className="text-sm text-gray-600">
                            {new Date(job.start_time).toLocaleDateString()} - {new Date(job.end_time).toLocaleDateString()}
                          </div>
                          <span className={`inline-block mt-1 px-2 py-0.5 rounded text-xs font-medium ${
                            job.status === 'Completed' ? 'bg-green-100 text-green-800' :
                            job.status === 'In Progress' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {job.status}
                          </span>
                        </div>
                        <Link href={`/jobs/${job.id}`}>
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4 mr-2" />
                            View Job
                          </Button>
                        </Link>
                      </div>
                    ))}
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
                  
                  <Button 
                    variant="outline" 
                    onClick={sendEstimateEmail}
                    disabled={updating || sendingEmail || !estimate?.clients?.email}
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    {sendingEmail ? 'Sending...' : 'Email to Client'}
                  </Button>

                  <Link href={`/invoices/new?estimateId=${estimate.id}&clientId=${estimate.client_id}`}>
                    <Button disabled={updating}>
                      <DollarSign className="h-4 w-4 mr-2" />
                      Create Invoice
                    </Button>
                  </Link>

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

                  {(estimate.status === 'Approved' || estimate.status === 'Scheduled') && linkedJobs.length === 0 && (
                    <Button 
                      onClick={() => setShowCreateJobModal(true)}
                      disabled={updating}
                      className="bg-purple-600 hover:bg-purple-700"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Create Job from Estimate
                    </Button>
                  )}
                  
                  {linkedJobs.length > 0 && (
                    <Link href={`/jobs/${linkedJobs[0].id}`}>
                      <Button variant="outline" disabled={updating}>
                        <Eye className="h-4 w-4 mr-2" />
                        View Linked Job
                      </Button>
                    </Link>
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

      {/* Create Job Modal */}
      <JobCreationModal
        isOpen={showCreateJobModal}
        onClose={() => setShowCreateJobModal(false)}
        onJobCreated={(job) => {
          setShowCreateJobModal(false);
          // Update estimate status to Scheduled if it's Approved
          if (estimate?.status === 'Approved') {
            updateEstimateStatus('Scheduled');
          }
          // Navigate to the new job
          router.push(`/jobs/${job.id}`);
        }}
        estimate={estimate ? {
          id: estimate.id,
          client_id: estimate.client_id,
          description: estimate.estimate_line_items?.map(item => item.description).join(', ') || estimate.clients?.name || 'Job from Estimate'
        } : null}
      />
    </div>
  )
}
