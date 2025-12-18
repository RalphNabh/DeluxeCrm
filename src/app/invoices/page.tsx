'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { 
  LayoutDashboard, 
  Users, 
  FileText, 
  DollarSign,
  Calendar,
  BarChart3,
  Zap, 
  Settings, 
  Search,
  Bell,
  ChevronDown,
  Plus,
  Filter,
  CheckCircle,
  Clock,
  AlertTriangle,
  Mail,
  Eye,
  Download,
  Edit,
  Trash2,
  CheckSquare,
  Gift
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import SignOutButton from '@/components/auth/sign-out'
import UserProfile from '@/components/layout/user-profile'
import PageSidebar from '@/components/layout/page-sidebar'
import PageHeader from '@/components/layout/page-header'
import StatsCards from '@/components/ui/stats-cards'
import EmptyState from '@/components/ui/empty-state'
import { NotificationBell } from '@/components/notifications/notification-bell'

const sidebarItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
  { icon: Users, label: "Clients", href: "/clients" },
  { icon: FileText, label: "Estimates", href: "/estimates" },
  { icon: DollarSign, label: "Invoices", href: "/invoices", active: true },
  { icon: Calendar, label: "Calendar", href: "/calendar" },
  { icon: CheckSquare, label: "Tasks", href: "/tasks" },
  { icon: BarChart3, label: "Reports", href: "/reports" },
  { icon: Users, label: "Team", href: "/team" },
  { icon: Zap, label: "Automations", href: "/automations" },
  { icon: Gift, label: "Affiliates", href: "/affiliates" },
  { icon: Settings, label: "Settings", href: "/settings" },
];

interface Invoice {
  id: string;
  invoice_number: string;
  client_id: string;
  status: 'Draft' | 'Sent' | 'Paid' | 'Overdue' | 'Cancelled';
  total: number;
  total_paid?: number;
  due_date?: string;
  created_at: string;
  clients?: {
    name: string;
    email?: string;
    phone?: string;
  };
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [sendingEmail, setSendingEmail] = useState<string | null>(null);

  useEffect(() => {
    fetchInvoices();
  }, [debouncedQuery]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(t);
  }, [query]);

  const fetchInvoices = async () => {
    try {
      const url = debouncedQuery ? `/api/invoices?q=${encodeURIComponent(debouncedQuery)}` : '/api/invoices';
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch invoices');
      }
      const data = await response.json();
      setInvoices(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Draft': return 'bg-gray-100 text-gray-800';
      case 'Sent': return 'bg-blue-100 text-blue-800';
      case 'Paid': return 'bg-green-100 text-green-800';
      case 'Overdue': return 'bg-red-100 text-red-800';
      case 'Cancelled': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Paid': return CheckCircle;
      case 'Overdue': return AlertTriangle;
      case 'Sent': return Mail;
      default: return Clock;
    }
  };

  const sendInvoiceEmail = async (invoice: Invoice) => {
    if (!invoice.clients?.email) {
      alert('Client email address is required')
      return
    }

    setSendingEmail(invoice.id)
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

      // Refresh invoices to get updated status
      await fetchInvoices()
      alert('Invoice sent successfully!')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send email')
      alert(err instanceof Error ? err.message : 'Failed to send email')
    } finally {
      setSendingEmail(null)
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center transition-colors">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading invoices...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center transition-colors">
        <div className="text-center">
          <p className="text-red-600 mb-4">Error: {error}</p>
          <Button onClick={fetchInvoices}>Try Again</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex transition-colors">
      {/* Sidebar */}
      <PageSidebar items={sidebarItems.map(item => ({
        ...item,
        active: item.active || false
      }))} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Bar */}
        <PageHeader
          title="Invoices"
          description="Manage your invoices and track payments."
          searchPlaceholder="Search invoices..."
          searchValue={query}
          onSearchChange={setQuery}
          showSearch={true}
          primaryAction={
            <Link href="/invoices/new">
              <Button variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                New Invoice
              </Button>
            </Link>
          }
          filters={
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              Filter
            </Button>
          }
        />

        {/* Invoices Content */}
        <main className="flex-1 p-6">
          {/* Enhanced Stats Cards */}
          <StatsCards
            stats={[
              {
                label: "Total Invoices",
                value: invoices.length,
                icon: DollarSign,
                iconColor: "text-blue-600",
                iconBg: "bg-blue-100",
                subtitle: "All time"
              },
              {
                label: "Paid",
                value: invoices.filter(i => i.status === 'Paid').length,
                icon: CheckCircle,
                iconColor: "text-green-600",
                iconBg: "bg-green-100",
                subtitle: invoices.length > 0 ? 
                  `${Math.round((invoices.filter(i => i.status === 'Paid').length / invoices.length) * 100)}% paid` 
                  : '0% paid'
              },
              {
                label: "Pending",
                value: invoices.filter(i => i.status === 'Sent').length,
                icon: Clock,
                iconColor: "text-orange-600",
                iconBg: "bg-orange-100",
                subtitle: "Awaiting payment"
              },
              {
                label: "Total Value",
                value: `$${invoices.reduce((sum, i) => sum + i.total, 0).toLocaleString()}`,
                icon: DollarSign,
                iconColor: "text-purple-600",
                iconBg: "bg-purple-100",
                subtitle: "All invoices"
              }
            ]}
          />

          {/* Invoices List */}
          {invoices.length === 0 ? (
            <EmptyState
              icon={DollarSign}
              title="No invoices yet"
              description="Get started by creating your first invoice."
              actionLabel="Create First Invoice"
              onAction={() => window.location.href = "/invoices/new"}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {invoices.map((invoice) => {
                const StatusIcon = getStatusIcon(invoice.status);
                return (
                  <Card key={invoice.id} className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-blue-100 rounded-lg">
                            <DollarSign className="h-5 w-5 text-blue-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900 text-lg">{invoice.invoice_number}</h3>
                            <p className="text-sm text-gray-600">{invoice.clients?.name || 'Unknown Client'}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <StatusIcon className="h-4 w-4" />
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(invoice.status)}`}>
                            {invoice.status}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Total</span>
                          <span className="font-semibold text-gray-900">${invoice.total.toLocaleString()}</span>
                        </div>
                        
                        {/* Payment Progress */}
                        {invoice.status !== 'Paid' && invoice.status !== 'Cancelled' && invoice.total_paid !== undefined && invoice.total_paid > 0 && (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-gray-600">Payment Progress</span>
                              <span className="text-gray-900">
                                ${invoice.total_paid.toLocaleString()} / ${invoice.total.toLocaleString()}
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-blue-600 h-2 rounded-full transition-all"
                                style={{ 
                                  width: `${Math.min((invoice.total_paid / invoice.total) * 100, 100)}%` 
                                }}
                              />
                            </div>
                          </div>
                        )}
                        
                        {invoice.due_date && (
                          <div className="flex items-center justify-between text-xs text-gray-500">
                            <span>Due {new Date(invoice.due_date).toLocaleDateString()}</span>
                            <div className="flex items-center">
                              <StatusIcon className="h-3 w-3 mr-1" />
                              <span>{invoice.status}</span>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="mt-4 pt-4 border-t border-gray-100">
                        <div className="flex items-center justify-between">
                          <Link href={`/invoices/${invoice.id}`}>
                            <Button variant="outline" size="sm">
                              <Eye className="h-4 w-4 mr-2" />
                              View
                            </Button>
                          </Link>
                          <div className="flex space-x-2">
                            <Button variant="ghost" size="sm">
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                sendInvoiceEmail(invoice)
                              }}
                              disabled={!invoice.clients?.email || sendingEmail === invoice.id}
                              title={invoice.clients?.email ? 'Email invoice to client' : 'Client email required'}
                            >
                              <Mail className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

