'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { 
  ArrowLeft,
  FileText,
  DollarSign,
  Mail,
  Phone,
  MapPin,
  Plus,
  Eye,
  Calendar,
  Clock,
  Tag,
  Folder,
  Edit,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react'
import { LayoutDashboard, Users, Settings, BarChart3, Zap } from 'lucide-react'
import UserProfile from '@/components/layout/user-profile'
import { formatCurrencyWithSymbol } from '@/lib/utils/currency'

const sidebarItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
  { icon: Users, label: "Clients", href: "/clients" },
  { icon: FileText, label: "Estimates", href: "/estimates" },
  { icon: DollarSign, label: "Invoices", href: "/invoices" },
  { icon: Calendar, label: "Calendar", href: "/calendar" },
  { icon: BarChart3, label: "Reports", href: "/reports" },
  { icon: Users, label: "Team", href: "/team" },
  { icon: Zap, label: "Automations", href: "/automations" },
  { icon: Settings, label: "Settings", href: "/settings" },
]

interface ClientFolder {
  id: string
  name: string
  color: string
}

interface Client {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  notes?: string;
  tags?: string[];
  folder_id?: string;
  total_value?: number;
  created_at: string;
  updated_at: string;
  client_folders?: ClientFolder;
}

interface Estimate {
  id: string;
  client_id: string;
  status: string;
  total: number;
  created_at: string;
  updated_at?: string;
}

interface Invoice {
  id: string;
  invoice_number: string;
  client_id: string;
  status: string;
  total: number;
  total_paid?: number;
  due_date?: string;
  created_at: string;
}

interface Job {
  id: string;
  client_id: string;
  title: string;
  status: string;
  start_time: string;
  end_time: string;
  location?: string;
  created_at: string;
}

interface ActivityItem {
  id: string;
  type: 'estimate' | 'invoice' | 'job' | 'client_created';
  title: string;
  description: string;
  date: string;
  status?: string;
  amount?: number;
}

export default function ClientDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [client, setClient] = useState<Client | null>(null)
  const [estimates, setEstimates] = useState<Estimate[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [jobs, setJobs] = useState<Job[]>([])
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (params.id) {
      load()
    }
  }, [params.id])

  const load = async () => {
    try {
      // Fetch all data in parallel
      const [cRes, eRes, iRes, jRes] = await Promise.all([
        fetch('/api/clients'),
        fetch(`/api/estimates?client_id=${params.id}`),
        fetch(`/api/invoices?client_id=${params.id}`),
        fetch('/api/jobs')
      ])

      // Process client
      if (!cRes.ok) throw new Error('Failed to fetch client')
      const all = await cRes.json()
      const c = all.find((x: Client) => x.id === params.id)
      if (!c) throw new Error('Client not found')
      setClient(c)

      // Process estimates
      const estimatesData = eRes.ok ? await eRes.json() : []
      setEstimates(estimatesData || [])

      // Process invoices
      const invoicesData = iRes.ok ? await iRes.json() : []
      setInvoices(invoicesData || [])

      // Process jobs
      const jobsData = jRes.ok ? await jRes.json() : []
      const clientJobs = jobsData.filter((job: Job) => job.client_id === params.id)
      setJobs(clientJobs || [])

      // Build activity timeline
      buildActivityTimeline(c, estimatesData || [], invoicesData || [], clientJobs || [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load client')
    } finally {
      setLoading(false)
    }
  }

  const buildActivityTimeline = (
    client: Client,
    estimates: Estimate[],
    invoices: Invoice[],
    jobs: Job[]
  ) => {
    const activities: ActivityItem[] = []

    // Add client creation
    activities.push({
      id: `client-${client.id}`,
      type: 'client_created',
      title: 'Client Created',
      description: `${client.name} was added to the system`,
      date: client.created_at
    })

    // Add estimates
    estimates.forEach(estimate => {
      activities.push({
        id: `estimate-${estimate.id}`,
        type: 'estimate',
        title: `Estimate #${estimate.id.slice(0, 8)}`,
        description: `Estimate created for ${formatCurrencyWithSymbol(estimate.total)}`,
        date: estimate.created_at,
        status: estimate.status,
        amount: estimate.total
      })
    })

    // Add invoices
    invoices.forEach(invoice => {
      activities.push({
        id: `invoice-${invoice.id}`,
        type: 'invoice',
        title: `Invoice ${invoice.invoice_number}`,
        description: `Invoice created for ${formatCurrencyWithSymbol(invoice.total)}`,
        date: invoice.created_at,
        status: invoice.status,
        amount: invoice.total
      })
    })

    // Add jobs
    jobs.forEach(job => {
      activities.push({
        id: `job-${job.id}`,
        type: 'job',
        title: job.title,
        description: `Job scheduled from ${new Date(job.start_time).toLocaleDateString()}`,
        date: job.created_at,
        status: job.status
      })
    })

    // Sort by date (newest first)
    activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    setActivities(activities)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Approved': case 'Paid': case 'Completed':
        return 'bg-green-100 text-green-800'
      case 'Sent': case 'In Progress':
        return 'bg-blue-100 text-blue-800'
      case 'Draft':
        return 'bg-gray-100 text-gray-800'
      case 'Rejected': case 'Cancelled':
        return 'bg-red-100 text-red-800'
      case 'Overdue':
        return 'bg-orange-100 text-orange-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Approved': case 'Paid': case 'Completed':
        return CheckCircle
      case 'Rejected': case 'Cancelled':
        return XCircle
      case 'Overdue':
        return AlertCircle
      default:
        return Clock
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading client...</p>
        </div>
      </div>
    )
  }

  if (error || !client) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Error: {error || 'Client not found'}</p>
          <Link href="/clients">
            <Button>Back to Clients</Button>
          </Link>
        </div>
      </div>
    )
  }

  const totalValue = estimates.reduce((sum, e) => sum + e.total, 0)
  const totalPaid = invoices.reduce((sum, i) => sum + (i.total_paid || 0), 0)
  const totalOutstanding = invoices.reduce((sum, i) => sum + (i.total - (i.total_paid || 0)), 0)

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
                    item.label === "Clients"
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
              <Link href="/clients">
                <Button variant="outline" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Clients
                </Button>
              </Link>
              <div className="flex items-center space-x-3">
                <Avatar className="h-10 w-10">
                  <AvatarFallback>{client.name.split(' ').map(n => n[0]).join('').toUpperCase()}</AvatarFallback>
                </Avatar>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{client.name}</h1>
                  {client.client_folders && (
                    <span
                      className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium mt-1"
                      style={{
                        backgroundColor: `${client.client_folders.color}20`,
                        color: client.client_folders.color,
                      }}
                    >
                      <Folder className="h-3 w-3 mr-1" />
                      {client.client_folders.name}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Link href={`/clients/${client.id}/edit`}>
                <Button variant="outline" size="sm">
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Client
                </Button>
              </Link>
              <Link href={`/estimates/new?clientId=${client.id}`}>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  New Estimate
                </Button>
              </Link>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card className="border-0 shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <FileText className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Total Estimates</p>
                      <p className="text-2xl font-bold text-gray-900">{estimates.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <DollarSign className="h-5 w-5 text-green-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Total Value</p>
                      <p className="text-2xl font-bold text-gray-900">{formatCurrencyWithSymbol(totalValue)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <CheckCircle className="h-5 w-5 text-purple-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Total Paid</p>
                      <p className="text-2xl font-bold text-gray-900">{formatCurrencyWithSymbol(totalPaid)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-orange-100 rounded-lg">
                      <AlertCircle className="h-5 w-5 text-orange-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Outstanding</p>
                      <p className="text-2xl font-bold text-gray-900">{formatCurrencyWithSymbol(totalOutstanding)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Client Info */}
              <div className="lg:col-span-1 space-y-6">
                <Card className="border-0 shadow-lg">
                  <CardHeader>
                    <CardTitle>Client Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {client.email && (
                      <div className="flex items-center text-sm text-gray-700">
                        <Mail className="h-4 w-4 mr-2 text-gray-400" />
                        <a href={`mailto:${client.email}`} className="text-blue-600 hover:underline">
                          {client.email}
                        </a>
                      </div>
                    )}
                    {client.phone && (
                      <div className="flex items-center text-sm text-gray-700">
                        <Phone className="h-4 w-4 mr-2 text-gray-400" />
                        <a href={`tel:${client.phone}`} className="text-blue-600 hover:underline">
                          {client.phone}
                        </a>
                      </div>
                    )}
                    {client.address && (
                      <div className="flex items-start text-sm text-gray-700">
                        <MapPin className="h-4 w-4 mr-2 mt-0.5 text-gray-400" />
                        <span>{client.address}</span>
                      </div>
                    )}

                    {client.tags && client.tags.length > 0 && (
                      <div className="pt-4 border-t">
                        <div className="text-xs font-medium text-gray-500 mb-2">Tags</div>
                        <div className="flex flex-wrap gap-2">
                          {client.tags.map((tag, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700"
                            >
                              <Tag className="h-3 w-3 mr-1" />
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {client.notes && (
                      <div className="pt-4 border-t">
                        <div className="text-xs font-medium text-gray-500 mb-2">Notes</div>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{client.notes}</p>
                      </div>
                    )}

                    <div className="pt-4 border-t text-xs text-gray-500">
                      <div>Created: {new Date(client.created_at).toLocaleDateString()}</div>
                      <div>Updated: {new Date(client.updated_at).toLocaleDateString()}</div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Activity Timeline and Lists */}
              <div className="lg:col-span-2 space-y-6">
                {/* Activity Timeline */}
                <Card className="border-0 shadow-lg">
                  <CardHeader>
                    <CardTitle>Activity Timeline</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {activities.length === 0 ? (
                      <div className="text-sm text-gray-600 text-center py-8">
                        No activity yet for this client.
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {activities.map((activity) => {
                          const StatusIcon = activity.status ? getStatusIcon(activity.status) : Clock
                          return (
                            <div key={activity.id} className="flex items-start space-x-4 pb-4 border-b last:border-0">
                              <div className="flex-shrink-0 mt-1">
                                {activity.type === 'estimate' && (
                                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                    <FileText className="h-4 w-4 text-blue-600" />
                                  </div>
                                )}
                                {activity.type === 'invoice' && (
                                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                                    <DollarSign className="h-4 w-4 text-green-600" />
                                  </div>
                                )}
                                {activity.type === 'job' && (
                                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                                    <Calendar className="h-4 w-4 text-purple-600" />
                                  </div>
                                )}
                                {activity.type === 'client_created' && (
                                  <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                                    <Users className="h-4 w-4 text-gray-600" />
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                  <h4 className="text-sm font-medium text-gray-900">{activity.title}</h4>
                                  <span className="text-xs text-gray-500">
                                    {new Date(activity.date).toLocaleDateString()}
                                  </span>
                                </div>
                                <p className="text-sm text-gray-600 mt-1">{activity.description}</p>
                                {activity.status && (
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium mt-2 ${getStatusColor(activity.status)}`}>
                                    <StatusIcon className="h-3 w-3 mr-1" />
                                    {activity.status}
                                  </span>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Estimates */}
                <Card className="border-0 shadow-lg">
                  <CardHeader className="flex items-center justify-between">
                    <CardTitle>Estimates ({estimates.length})</CardTitle>
                    <Link href={`/estimates/new?clientId=${client.id}`}>
                      <Button size="sm" variant="outline">
                        <Plus className="h-4 w-4 mr-2" />
                        New Estimate
                      </Button>
                    </Link>
                  </CardHeader>
                  <CardContent>
                    {estimates.length === 0 ? (
                      <div className="text-sm text-gray-600 text-center py-8">
                        No estimates for this client yet.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {estimates.map((e) => (
                          <div key={e.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2">
                                <span className="text-sm font-medium text-gray-900">#{e.id.slice(0, 8)}</span>
                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(e.status)}`}>
                                  {e.status}
                                </span>
                              </div>
                              <div className="text-sm text-gray-600 mt-1">
                                {formatCurrencyWithSymbol(e.total)} • {new Date(e.created_at).toLocaleDateString()}
                              </div>
                            </div>
                            <Link href={`/estimates/${e.id}`}>
                              <Button variant="outline" size="sm">
                                <Eye className="h-4 w-4 mr-2" />
                                View
                              </Button>
                            </Link>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Invoices */}
                <Card className="border-0 shadow-lg">
                  <CardHeader className="flex items-center justify-between">
                    <CardTitle>Invoices ({invoices.length})</CardTitle>
                    <Link href={`/invoices/new?clientId=${client.id}`}>
                      <Button size="sm" variant="outline">
                        <Plus className="h-4 w-4 mr-2" />
                        New Invoice
                      </Button>
                    </Link>
                  </CardHeader>
                  <CardContent>
                    {invoices.length === 0 ? (
                      <div className="text-sm text-gray-600 text-center py-8">
                        No invoices for this client yet.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {invoices.map((i) => (
                          <div key={i.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2">
                                <span className="text-sm font-medium text-gray-900">{i.invoice_number}</span>
                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(i.status)}`}>
                                  {i.status}
                                </span>
                              </div>
                              <div className="text-sm text-gray-600 mt-1">
                                {formatCurrencyWithSymbol(i.total)}
                                {i.total_paid && i.total_paid > 0 && (
                                  <span className="ml-2">• Paid: {formatCurrencyWithSymbol(i.total_paid)}</span>
                                )}
                                {i.due_date && (
                                  <span className="ml-2">• Due: {new Date(i.due_date).toLocaleDateString()}</span>
                                )}
                              </div>
                            </div>
                            <Link href={`/invoices/${i.id}`}>
                              <Button variant="outline" size="sm">
                                <Eye className="h-4 w-4 mr-2" />
                                View
                              </Button>
                            </Link>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Jobs */}
                <Card className="border-0 shadow-lg">
                  <CardHeader className="flex items-center justify-between">
                    <CardTitle>Jobs ({jobs.length})</CardTitle>
                    <Link href={`/calendar?newJob=true&clientId=${client.id}`}>
                      <Button size="sm" variant="outline">
                        <Plus className="h-4 w-4 mr-2" />
                        New Job
                      </Button>
                    </Link>
                  </CardHeader>
                  <CardContent>
                    {jobs.length === 0 ? (
                      <div className="text-sm text-gray-600 text-center py-8">
                        No jobs scheduled for this client yet.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {jobs.map((j) => (
                          <div key={j.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2">
                                <span className="text-sm font-medium text-gray-900">{j.title}</span>
                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(j.status)}`}>
                                  {j.status}
                                </span>
                              </div>
                              <div className="text-sm text-gray-600 mt-1">
                                {new Date(j.start_time).toLocaleDateString()} • {new Date(j.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                {j.location && (
                                  <span className="ml-2">• {j.location}</span>
                                )}
                              </div>
                            </div>
                            <Link href={`/jobs/${j.id}`}>
                              <Button variant="outline" size="sm">
                                <Eye className="h-4 w-4 mr-2" />
                                View
                              </Button>
                            </Link>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
