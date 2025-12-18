"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Calendar, 
  FileText, 
  DollarSign, 
  MessageSquare, 
  Phone, 
  Mail, 
  MapPin, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  Eye, 
  Download,
  LogOut,
  Bell,
  Settings,
  Home
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { formatCurrencyWithSymbol } from "@/lib/utils/currency";

interface ClientJob {
  id: string;
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  status: 'Scheduled' | 'In Progress' | 'Completed' | 'Cancelled';
  location?: string;
  estimated_duration?: number;
  team_members?: string[];
}

interface ClientEstimate {
  id: string;
  estimate_number: string;
  total: number;
  status: 'Draft' | 'Sent' | 'Approved' | 'Rejected';
  created_at: string;
  valid_until?: string;
}

interface ClientInvoice {
  id: string;
  invoice_number: string;
  total: number;
  status: 'Draft' | 'Sent' | 'Paid' | 'Overdue';
  created_at: string;
  due_date?: string;
}

export default function ClientDashboard() {
  const [user, setUser] = useState<any>(null);
  const [jobs, setJobs] = useState<ClientJob[]>([]);
  const [estimates, setEstimates] = useState<ClientEstimate[]>([]);
  const [invoices, setInvoices] = useState<ClientInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    try {
      const supabase = createClient();
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error || !user) {
        router.push("/client-login");
        return;
      }

      if (user.user_metadata?.user_type !== 'client') {
        router.push("/dashboard");
        return;
      }

      setUser(user);
      await fetchClientData();
    } catch (err) {
      setError("Failed to load client data");
    } finally {
      setLoading(false);
    }
  };

  const fetchClientData = async () => {
    try {
      // In a real app, you'd fetch client-specific data
      // For prototype, we'll use sample data
      setJobs([
        {
          id: "1",
          title: "Lawn Maintenance",
          description: "Weekly lawn care and maintenance",
          start_time: "2024-01-15T09:00:00Z",
          end_time: "2024-01-15T11:00:00Z",
          status: "Scheduled",
          location: "123 Main St, City, State",
          estimated_duration: 2,
          team_members: ["John Smith", "Mike Johnson"]
        },
        {
          id: "2",
          title: "Tree Trimming",
          description: "Trim oak tree in backyard",
          start_time: "2024-01-20T08:00:00Z",
          end_time: "2024-01-20T12:00:00Z",
          status: "In Progress",
          location: "123 Main St, City, State",
          estimated_duration: 4,
          team_members: ["John Smith"]
        }
      ]);

      setEstimates([
        {
          id: "1",
          estimate_number: "EST-001",
          total: 250.00,
          status: "Approved",
          created_at: "2024-01-10T00:00:00Z",
          valid_until: "2024-02-10T00:00:00Z"
        }
      ]);

      setInvoices([
        {
          id: "1",
          invoice_number: "INV-001",
          total: 250.00,
          status: "Paid",
          created_at: "2024-01-15T00:00:00Z",
          due_date: "2024-02-15T00:00:00Z"
        }
      ]);
    } catch (err) {
      console.error("Error fetching client data:", err);
    }
  };

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Scheduled': return 'bg-blue-100 text-blue-800';
      case 'In Progress': return 'bg-yellow-100 text-yellow-800';
      case 'Completed': return 'bg-green-100 text-green-800';
      case 'Cancelled': return 'bg-red-100 text-red-800';
      case 'Approved': return 'bg-green-100 text-green-800';
      case 'Sent': return 'bg-blue-100 text-blue-800';
      case 'Paid': return 'bg-green-100 text-green-800';
      case 'Overdue': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Scheduled': return Clock;
      case 'In Progress': return AlertTriangle;
      case 'Completed': return CheckCircle;
      case 'Cancelled': return AlertTriangle;
      default: return Clock;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 mb-4">Error: {error}</p>
          <Button onClick={() => window.location.reload()}>Try Again</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Link href="/" className="text-2xl font-bold text-blue-600">
                DyluxePro
              </Link>
              <span className="text-sm text-gray-500">Client Portal</span>
            </div>
            
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm">
                <Bell className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm">
                <Settings className="h-4 w-4" />
              </Button>
              <div className="flex items-center space-x-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback>
                    {user?.user_metadata?.first_name?.[0]}{user?.user_metadata?.last_name?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden sm:block">
                  <p className="text-sm font-medium text-gray-900">
                    {user?.user_metadata?.first_name} {user?.user_metadata?.last_name}
                  </p>
                  <p className="text-xs text-gray-500">{user?.email}</p>
                </div>
                <Button variant="ghost" size="sm" onClick={handleSignOut}>
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome back, {user?.user_metadata?.first_name}!
          </h1>
          <p className="text-gray-600">
            Here's an overview of your projects and communications with your contractor.
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Calendar className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Active Jobs</p>
                  <p className="text-2xl font-bold text-gray-900">{jobs.filter(j => j.status === 'Scheduled' || j.status === 'In Progress').length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-3 bg-green-100 rounded-lg">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Completed</p>
                  <p className="text-2xl font-bold text-gray-900">{jobs.filter(j => j.status === 'Completed').length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-3 bg-yellow-100 rounded-lg">
                  <FileText className="h-6 w-6 text-yellow-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Estimates</p>
                  <p className="text-2xl font-bold text-gray-900">{estimates.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-3 bg-purple-100 rounded-lg">
                  <DollarSign className="h-6 w-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Invoices</p>
                  <p className="text-2xl font-bold text-gray-900">{invoices.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Jobs */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Your Jobs</h2>
            <Button variant="outline" size="sm">
              <MessageSquare className="h-4 w-4 mr-2" />
              Message Contractor
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {jobs.map((job) => {
              const StatusIcon = getStatusIcon(job.status);
              return (
                <Card key={job.id} className="border-0 shadow-lg hover:shadow-xl transition-all duration-300">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <Calendar className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{job.title}</h3>
                          <p className="text-sm text-gray-600">{formatDate(job.start_time)}</p>
                        </div>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(job.status)}`}>
                        {job.status}
                      </span>
                    </div>

                    {job.description && (
                      <p className="text-sm text-gray-600 mb-4">{job.description}</p>
                    )}

                    <div className="space-y-2 mb-4">
                      {job.location && (
                        <div className="flex items-center text-sm text-gray-600">
                          <MapPin className="h-4 w-4 mr-2" />
                          <span className="truncate">{job.location}</span>
                        </div>
                      )}
                      
                      {job.estimated_duration && (
                        <div className="flex items-center text-sm text-gray-600">
                          <Clock className="h-4 w-4 mr-2" />
                          <span>{job.estimated_duration} hours</span>
                        </div>
                      )}

                      {job.team_members && job.team_members.length > 0 && (
                        <div className="text-sm text-gray-600">
                          <span className="font-medium">Team: </span>
                          {job.team_members.join(', ')}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </Button>
                      <div className="flex space-x-2">
                        <Button variant="ghost" size="sm">
                          <MessageSquare className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Phone className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Recent Estimates & Invoices */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Estimates */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Estimates</h3>
            <div className="space-y-4">
              {estimates.map((estimate) => (
                <Card key={estimate.id} className="border-0 shadow-lg">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-gray-900">{estimate.estimate_number}</h4>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(estimate.status)}`}>
                        {estimate.status}
                      </span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900 mb-2">
                      {formatCurrencyWithSymbol(estimate.total)}
                    </p>
                    <p className="text-sm text-gray-600 mb-3">
                      Created: {new Date(estimate.created_at).toLocaleDateString()}
                    </p>
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4 mr-2" />
                        View
                      </Button>
                      <Button variant="outline" size="sm">
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Invoices */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Invoices</h3>
            <div className="space-y-4">
              {invoices.map((invoice) => (
                <Card key={invoice.id} className="border-0 shadow-lg">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-gray-900">{invoice.invoice_number}</h4>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(invoice.status)}`}>
                        {invoice.status}
                      </span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900 mb-2">
                      {formatCurrencyWithSymbol(invoice.total)}
                    </p>
                    <p className="text-sm text-gray-600 mb-3">
                      Due: {invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : 'N/A'}
                    </p>
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4 mr-2" />
                        View
                      </Button>
                      <Button variant="outline" size="sm">
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}


