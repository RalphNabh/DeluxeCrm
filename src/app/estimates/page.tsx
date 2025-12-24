"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  Download,
  Check,
  X,
  Edit,
  Phone,
  Mail,
  MapPin,
  Plus,
  Eye,
  Clock,
  CheckSquare,
  Gift,
  Menu
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import SignOutButton from "@/components/auth/sign-out";
import UserProfile from "@/components/layout/user-profile";
import PageSidebar from "@/components/layout/page-sidebar";
import PageHeader from "@/components/layout/page-header";
import StatsCards from "@/components/ui/stats-cards";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { formatCurrencyWithSymbol } from "@/lib/utils/currency";
import { Package } from "lucide-react";

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
  { icon: FileText, label: "Estimates", href: "/estimates", active: true },
  { icon: DollarSign, label: "Invoices", href: "/invoices" },
  { icon: Calendar, label: "Calendar", href: "/calendar" },
  { icon: CheckSquare, label: "Tasks", href: "/tasks" },
  { icon: BarChart3, label: "Reports", href: "/reports" },
  { icon: Users, label: "Team", href: "/team" },
  { icon: Zap, label: "Automations", href: "/automations" },
  { icon: Gift, label: "Affiliates", href: "/affiliates" },
  { icon: Settings, label: "Settings", href: "/settings" },
];

export default function EstimatePage() {
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [linkedJobsMap, setLinkedJobsMap] = useState<Record<string, any[]>>({});
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    fetchEstimates();
  }, []);

  const fetchEstimates = async () => {
    try {
      const response = await fetch('/api/estimates');
      if (!response.ok) {
        throw new Error('Failed to fetch estimates');
      }
      const data = await response.json();
      setEstimates(data);
      
      // Fetch linked jobs for all estimates
      try {
        const jobsResponse = await fetch('/api/jobs');
        if (jobsResponse.ok) {
          const jobs = await jobsResponse.json();
          const jobsMap: Record<string, any[]> = {};
          data.forEach((estimate: Estimate) => {
            const linked = jobs.filter((job: Record<string, unknown>) => 
              job.estimate_id === estimate.id
            );
            if (linked.length > 0) {
              jobsMap[estimate.id] = linked;
            }
          });
          setLinkedJobsMap(jobsMap);
        }
      } catch (e) {
        // Column may not exist yet, ignore
        console.log('Could not fetch linked jobs:', e);
      }
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
      case 'Approved': return 'bg-green-100 text-green-800';
      case 'Rejected': return 'bg-red-100 text-red-800';
      case 'Scheduled': return 'bg-purple-100 text-purple-800';
      case 'Completed': return 'bg-emerald-100 text-emerald-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center transition-colors">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading estimates...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center transition-colors">
        <div className="text-center">
          <p className="text-red-600 mb-4">Error: {error}</p>
          <Button onClick={fetchEstimates}>Try Again</Button>
        </div>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex transition-colors">
      {/* Sidebar */}
      <PageSidebar 
        items={sidebarItems.map(item => ({
          ...item,
          active: item.active || false
        }))}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Menu Button */}
        <div className="md:hidden bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarOpen(true)}
            className="mr-3"
            aria-label="Open sidebar"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <Link href="/" className="text-lg font-bold text-blue-600 dark:text-blue-400">
            DyluxePro
          </Link>
        </div>

        {/* Top Bar */}
        <PageHeader
          title="Estimates"
          description="Manage your project estimates and track approval status."
          primaryAction={
            <Link href="/estimates/new">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Estimate
              </Button>
            </Link>
          }
          secondaryActions={
            <Link href="/materials">
              <Button variant="outline">
                <Package className="h-4 w-4 mr-2" />
                Materials Catalog
              </Button>
            </Link>
          }
        />

        {/* Estimates Content */}
        <main className="flex-1 p-6">
          {/* Stats Cards */}
          <StatsCards
            stats={[
              {
                label: "Total Estimates",
                value: estimates.length,
                icon: FileText,
                iconColor: "text-blue-600",
                iconBg: "bg-blue-100"
              },
              {
                label: "Approved",
                value: estimates.filter(e => e.status === 'Approved').length,
                icon: Check,
                iconColor: "text-green-600",
                iconBg: "bg-green-100"
              },
              {
                label: "Pending",
                value: estimates.filter(e => e.status === 'Sent').length,
                icon: Calendar,
                iconColor: "text-orange-600",
                iconBg: "bg-orange-100"
              },
              {
                label: "Total Value",
                value: formatCurrencyWithSymbol(estimates.reduce((sum, e) => sum + e.total, 0)),
                icon: DollarSign,
                iconColor: "text-purple-600",
                iconBg: "bg-purple-100"
              }
            ]}
          />

          {/* Estimates List */}
          {estimates.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No estimates yet</h3>
              <p className="text-gray-600 mb-4">Get started by creating your first estimate.</p>
              <Link href="/estimates/new">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Estimate
                </Button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {estimates.map((estimate) => (
                <Card key={estimate.id} className="border-0 shadow-lg hover:shadow-xl transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <h3 className="font-semibold text-gray-900">#{estimate.id.slice(0, 8)}</h3>
                          {linkedJobsMap[estimate.id] && linkedJobsMap[estimate.id].length > 0 && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800" title="Has linked job">
                              <Calendar className="h-3 w-3 mr-1" />
                              Job
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">{estimate.clients?.name || 'Unknown Client'}</p>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(estimate.status)}`}>
                        {estimate.status}
                      </span>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Total</span>
                        <span className="font-semibold text-gray-900">{formatCurrencyWithSymbol(estimate.total)}</span>
                      </div>
                      
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>Created {new Date(estimate.created_at).toLocaleDateString()}</span>
                        <span>{estimate.estimate_line_items?.length || 0} items</span>
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <div className="flex items-center justify-between">
                        <Link href={`/estimates/${estimate.id}`}>
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4 mr-2" />
                            View
                          </Button>
                        </Link>
                        <div className="flex space-x-2">
                          <Button variant="ghost" size="sm">
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
