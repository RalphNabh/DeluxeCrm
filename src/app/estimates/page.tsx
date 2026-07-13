"use client";

import { useState, useMemo } from "react";
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
  Menu,
  Tag,
  Filter
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
import { Package, Sparkles } from "lucide-react";
import { useEstimatesQuery, useJobsQuery } from "@/lib/query/hooks";
import { ListPageSkeleton } from "@/components/ui/page-skeletons";

interface Estimate {
  id: string;
  client_id: string;
  lead_id?: string;
  status: 'Draft' | 'Sent' | 'Approved' | 'Rejected' | 'Scheduled' | 'Completed';
  subtotal: number;
  tax: number;
  total: number;
  tags?: string[];
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

export default function EstimatePage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const {
    data,
    isLoading,
    error: queryError,
    refetch,
  } = useEstimatesQuery();
  const { data: jobsData } = useJobsQuery();

  const allEstimates = (data ?? []) as Estimate[];
  const jobs = (jobsData ?? []) as Array<Record<string, unknown>>;

  const availableTags = useMemo(() => {
    const allTags = new Set<string>();
    allEstimates.forEach((estimate) => {
      if (estimate.tags && Array.isArray(estimate.tags)) {
        estimate.tags.forEach((tag) => allTags.add(tag));
      }
    });
    return Array.from(allTags).sort();
  }, [allEstimates]);

  const estimates = useMemo(() => {
    if (!selectedTag) return allEstimates;
    return allEstimates.filter(
      (estimate) =>
        estimate.tags &&
        Array.isArray(estimate.tags) &&
        estimate.tags.includes(selectedTag),
    );
  }, [allEstimates, selectedTag]);

  const linkedJobsMap = useMemo(() => {
    const jobsMap: Record<string, unknown[]> = {};
    allEstimates.forEach((estimate) => {
      const linked = jobs.filter((job) => job.estimate_id === estimate.id);
      if (linked.length > 0) {
        jobsMap[estimate.id] = linked;
      }
    });
    return jobsMap;
  }, [allEstimates, jobs]);

  const error =
    queryError instanceof Error ? queryError.message : queryError ? "An error occurred" : null;

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

  if (error && !data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Error: {error}</p>
          <Button onClick={() => refetch()}>Try Again</Button>
        </div>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-gray-50 flex transition-colors">
      {/* Sidebar */}
      <PageSidebar 
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Menu Button */}
        <div className="md:hidden bg-white border-b border-gray-200 px-4 py-3 flex items-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarOpen(true)}
            className="mr-3"
            aria-label="Open sidebar"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <Link href="/" className="text-lg font-bold text-blue-600">
            DyluxePro
          </Link>
        </div>

        {/* Top Bar */}
        <PageHeader
          title="Estimates"
          description="Manage your project estimates and track approval status."
          primaryAction={
            <Link href="/estimates/new/ai">
              <Button className="bg-teal-600 hover:bg-teal-700">
                <Sparkles className="h-4 w-4 mr-2" />
                New AI Estimate
              </Button>
            </Link>
          }
          secondaryActions={
            <>
              <Link href="/estimates/new">
                <Button variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  New Estimate
                </Button>
              </Link>
              {availableTags.length > 0 && (
                <Button 
                  variant="outline"
                  onClick={() => setShowFilters(!showFilters)}
                >
                  <Filter className="h-4 w-4 mr-2" />
                  Filters
                </Button>
              )}
              <Link href="/materials">
                <Button variant="outline">
                  <Package className="h-4 w-4 mr-2" />
                  Materials Catalog
                </Button>
              </Link>
            </>
          }
          filters={
            showFilters && availableTags.length > 0 ? (
              <div className="flex items-center space-x-2 flex-wrap gap-2 pt-4 border-t">
                <span className="text-sm font-medium text-gray-700">Filter by Tag:</span>
                <Button
                  variant={selectedTag === null ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedTag(null)}
                  className="whitespace-nowrap"
                >
                  All Tags
                </Button>
                {availableTags.map((tag) => (
                  <Button
                    key={tag}
                    variant={selectedTag === tag ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                    className="whitespace-nowrap"
                  >
                    <Tag className="h-3 w-3 mr-1" />
                    {tag}
                  </Button>
                ))}
                {selectedTag && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedTag(null)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    Clear
                  </Button>
                )}
              </div>
            ) : undefined
          }
        />

        {/* Estimates Content */}
        <main className="flex-1 p-6">
          {isLoading && !data ? (
            <ListPageSkeleton />
          ) : (
          <>
          {/* Stats Cards */}
          <StatsCards
            stats={[
              {
                label: "Total Estimates",
                value: allEstimates.length,
                icon: FileText,
                iconColor: "text-blue-600",
                iconBg: "bg-blue-100"
              },
              {
                label: "Approved",
                value: allEstimates.filter(e => e.status === 'Approved').length,
                icon: Check,
                iconColor: "text-green-600",
                iconBg: "bg-green-100"
              },
              {
                label: "Pending",
                value: allEstimates.filter(e => e.status === 'Sent').length,
                icon: Clock,
                iconColor: "text-yellow-600",
                iconBg: "bg-yellow-100"
              },
              {
                label: "Total Value",
                value: formatCurrencyWithSymbol(allEstimates.reduce((sum, e) => sum + Number(e.total || 0), 0)),
                icon: DollarSign,
                iconColor: "text-green-600",
                iconBg: "bg-green-100"
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
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1 flex-wrap">
                          <h3 className="font-semibold text-gray-900">#{estimate.id.slice(0, 8)}</h3>
                          {linkedJobsMap[estimate.id] && linkedJobsMap[estimate.id].length > 0 && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800" title="Has linked job">
                              <Calendar className="h-3 w-3 mr-1" />
                              Job
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 truncate">{estimate.clients?.name || 'Unknown Client'}</p>
                        {estimate.tags && estimate.tags.length > 0 && (
                          <div className="flex items-center space-x-1 mt-2 flex-wrap gap-1">
                            {estimate.tags.slice(0, 3).map((tag) => (
                              <span
                                key={tag}
                                className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
                              >
                                <Tag className="h-3 w-3 mr-1" />
                                {tag}
                              </span>
                            ))}
                            {estimate.tags.length > 3 && (
                              <span className="text-xs text-gray-500">+{estimate.tags.length - 3}</span>
                            )}
                          </div>
                        )}
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium flex-shrink-0 ${getStatusColor(estimate.status)}`}>
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
                      <div className="flex items-center justify-end space-x-2">
                        <Link href={`/estimates/${estimate.id}`} onClick={(e) => e.stopPropagation()}>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            title="View Estimate"
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View
                          </Button>
                        </Link>
                        <Link href={`/estimates/${estimate.id}?edit=true`} onClick={(e) => e.stopPropagation()}>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            title="Edit Estimate"
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </Button>
                        </Link>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={async (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            // Navigate to estimate page with download intent
                            window.location.href = `/estimates/${estimate.id}?download=true`;
                          }}
                          title="Download PDF"
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
          </>
          )}
        </main>
      </div>
    </div>
  );
}
