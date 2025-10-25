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
  Zap, 
  Settings, 
  Search,
  Bell,
  User,
  ChevronDown,
  Plus,
  Filter,
  Clock,
  MapPin,
  Phone,
  Mail,
  CheckCircle,
  AlertTriangle,
  Edit,
  Trash2
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import SignOutButton from "@/components/auth/sign-out";
import JobCreationModal from "@/components/jobs/job-creation-modal";

const sidebarItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
  { icon: Users, label: "Clients", href: "/clients" },
  { icon: FileText, label: "Estimates", href: "/estimates" },
  { icon: DollarSign, label: "Invoices", href: "/invoices" },
  { icon: Calendar, label: "Calendar", href: "/calendar", active: true },
  { icon: Zap, label: "Automations", href: "/automations" },
  { icon: Settings, label: "Settings", href: "/settings" },
];

interface Job {
  id: string;
  title: string;
  client_id: string;
  client_name: string;
  start_time: string;
  end_time: string;
  status: 'Scheduled' | 'In Progress' | 'Completed' | 'Cancelled';
  location: string;
  description?: string;
  estimated_duration: number; // in hours
  actual_duration?: number;
  team_members?: string[];
  equipment?: string[];
  notes?: string;
}

export default function CalendarPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [view, setView] = useState<'month' | 'week' | 'day'>('week');
  const [showAddJob, setShowAddJob] = useState(false);

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/jobs');
      if (!response.ok) throw new Error('Failed to fetch jobs');
      const data = await response.json();
      setJobs(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch jobs');
    } finally {
      setLoading(false);
    }
  };

  const handleJobCreated = (newJob: any) => {
    setJobs(prev => [...prev, newJob]);
  };

  const getJobsForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return jobs.filter(job => 
      job.start_time.startsWith(dateStr)
    );
  };

  const getJobsForWeek = (date: Date) => {
    const startOfWeek = new Date(date);
    startOfWeek.setDate(date.getDate() - date.getDay());
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    
    return jobs.filter(job => {
      const jobDate = new Date(job.start_time);
      return jobDate >= startOfWeek && jobDate <= endOfWeek;
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Scheduled': return 'bg-blue-100 text-blue-800';
      case 'In Progress': return 'bg-yellow-100 text-yellow-800';
      case 'Completed': return 'bg-green-100 text-green-800';
      case 'Cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Scheduled': return Clock;
      case 'In Progress': return AlertTriangle;
      case 'Completed': return CheckCircle;
      case 'Cancelled': return Trash2;
      default: return Clock;
    }
  };

  const formatTime = (timeString: string) => {
    return new Date(timeString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const getWeekDays = () => {
    const startOfWeek = new Date(selectedDate);
    startOfWeek.setDate(selectedDate.getDate() - selectedDate.getDay());
    
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      return date;
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading calendar...</p>
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
          <Button onClick={fetchJobs}>Try Again</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-lg">
        <div className="p-4 border-b border-gray-200">
          <Link href="/" className="text-xl font-bold text-blue-600">DyluxePro</Link>
        </div>
        
        <nav className="flex-1 px-4">
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

        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center space-x-3">
            <Avatar className="h-8 w-8">
              <AvatarImage src="/placeholder-avatar.jpg" />
              <AvatarFallback>JD</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">John Doe</p>
              <p className="text-xs text-gray-500 truncate">john@dyluxepro.com</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Bar */}
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Calendar</h1>
              <p className="text-gray-600 mt-1">Schedule and manage your jobs and appointments.</p>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Button
                  variant={view === 'month' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setView('month')}
                >
                  Month
                </Button>
                <Button
                  variant={view === 'week' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setView('week')}
                >
                  Week
                </Button>
                <Button
                  variant={view === 'day' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setView('day')}
                >
                  Day
                </Button>
              </div>
              
              <Button onClick={() => setShowAddJob(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Schedule Job
              </Button>
              
              <Button variant="ghost" size="sm">
                <Bell className="h-4 w-4" />
              </Button>
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

        {/* Calendar Content */}
        <main className="flex-1 p-6">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              {selectedDate.toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </h2>
          </div>

          {/* Calendar View */}
          {view === 'week' && (
            <div className="bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden">
              {/* Week Header */}
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
                <div className="grid grid-cols-8">
                  <div className="p-6 border-r border-blue-500/20">
                    <div className="text-sm font-medium opacity-90">Time</div>
                  </div>
                  {getWeekDays().map((day, index) => (
                    <div key={index} className="p-6 border-r border-blue-500/20 text-center">
                      <div className="text-sm font-medium opacity-90 mb-1">
                        {day.toLocaleDateString('en-US', { weekday: 'short' })}
                      </div>
                      <div className="text-2xl font-bold">
                        {day.getDate()}
                      </div>
                      <div className="text-xs opacity-75 mt-1">
                        {day.toLocaleDateString('en-US', { month: 'short' })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Week Body */}
              <div className="grid grid-cols-8 min-h-[600px]">
                <div className="p-4 border-r bg-gray-50/50">
                  <div className="space-y-8">
                    {Array.from({ length: 12 }, (_, i) => {
                      const hour = 8 + i;
                      return (
                        <div key={hour} className="text-xs text-gray-500 font-medium">
                          {hour === 12 ? '12:00 PM' : hour > 12 ? `${hour - 12}:00 PM` : `${hour}:00 AM`}
                        </div>
                      );
                    })}
                  </div>
                </div>
                {getWeekDays().map((day, dayIndex) => (
                  <div key={dayIndex} className="p-2 border-r bg-white relative">
                    <div className="space-y-2">
                      {getJobsForDate(day).map((job) => {
                        const StatusIcon = getStatusIcon(job.status);
                        const startHour = new Date(job.start_time).getHours();
                        const duration = job.estimated_duration || 2;
                        const topPosition = (startHour - 8) * 50 + 20;
                        
                        return (
                          <div
                            key={job.id}
                            className="absolute left-2 right-2 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105"
                            style={{ top: `${topPosition}px`, height: `${duration * 50}px` }}
                          >
                            <div className="flex items-center space-x-2 mb-1">
                              <StatusIcon className="h-3 w-3 text-blue-600" />
                              <span className="text-xs font-semibold text-blue-900">
                                {formatTime(job.start_time)}
                              </span>
                            </div>
                            <div className="text-sm font-semibold text-gray-900 truncate mb-1">
                              {job.title}
                            </div>
                            <div className="text-xs text-gray-600 truncate">
                              {job.client_name}
                            </div>
                            {job.location && (
                              <div className="text-xs text-gray-500 truncate mt-1">
                                📍 {job.location}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Month View */}
          {view === 'month' && (
            <div className="bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden">
              {/* Month Header */}
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold">
                    {selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </h2>
                  <div className="flex items-center space-x-4">
                    <Button variant="ghost" size="sm" className="text-white hover:bg-white/20">
                      ←
                    </Button>
                    <Button variant="ghost" size="sm" className="text-white hover:bg-white/20">
                      →
                    </Button>
                  </div>
                </div>
              </div>

              {/* Month Grid */}
              <div className="grid grid-cols-7">
                {/* Day Headers */}
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                  <div key={day} className="p-4 bg-gray-50 border-r border-b text-center font-semibold text-gray-700">
                    {day}
                  </div>
                ))}
                
                {/* Calendar Days */}
                {Array.from({ length: 35 }, (_, i) => {
                  const date = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), i - 6);
                  const isCurrentMonth = date.getMonth() === selectedDate.getMonth();
                  const isToday = date.toDateString() === new Date().toDateString();
                  const dayJobs = getJobsForDate(date);
                  
                  return (
                    <div
                      key={i}
                      className={`p-3 border-r border-b min-h-[120px] ${
                        isCurrentMonth ? 'bg-white' : 'bg-gray-50'
                      } ${isToday ? 'bg-blue-50 border-blue-200' : ''}`}
                    >
                      <div className={`text-sm font-medium mb-2 ${
                        isCurrentMonth ? 'text-gray-900' : 'text-gray-400'
                      } ${isToday ? 'text-blue-600' : ''}`}>
                        {date.getDate()}
                      </div>
                      <div className="space-y-1">
                        {dayJobs.slice(0, 3).map((job) => {
                          const StatusIcon = getStatusIcon(job.status);
                          return (
                            <div
                              key={job.id}
                              className="p-2 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded text-xs cursor-pointer hover:shadow-md transition-all"
                            >
                              <div className="flex items-center space-x-1 mb-1">
                                <StatusIcon className="h-2 w-2 text-blue-600" />
                                <span className="font-medium text-blue-900">
                                  {formatTime(job.start_time)}
                                </span>
                              </div>
                              <div className="text-gray-900 truncate font-medium">
                                {job.title}
                              </div>
                              <div className="text-gray-600 truncate">
                                {job.client_name}
                              </div>
                            </div>
                          );
                        })}
                        {dayJobs.length > 3 && (
                          <div className="text-xs text-gray-500 font-medium">
                            +{dayJobs.length - 3} more
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Day View */}
          {view === 'day' && (
            <div className="bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden">
              {/* Day Header */}
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold">
                    {selectedDate.toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      month: 'long', 
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </h2>
                  <div className="flex items-center space-x-4">
                    <Button variant="ghost" size="sm" className="text-white hover:bg-white/20">
                      ←
                    </Button>
                    <Button variant="ghost" size="sm" className="text-white hover:bg-white/20">
                      →
                    </Button>
                  </div>
                </div>
              </div>

              {/* Day Timeline */}
              <div className="p-6">
                <div className="space-y-4">
                  {Array.from({ length: 12 }, (_, i) => {
                    const hour = 8 + i;
                    const hourJobs = getJobsForDate(selectedDate).filter(job => {
                      const jobHour = new Date(job.start_time).getHours();
                      return jobHour === hour;
                    });
                    
                    return (
                      <div key={hour} className="flex">
                        <div className="w-20 text-sm text-gray-500 font-medium pt-2">
                          {hour === 12 ? '12:00 PM' : hour > 12 ? `${hour - 12}:00 PM` : `${hour}:00 AM`}
                        </div>
                        <div className="flex-1 ml-4">
                          {hourJobs.length > 0 ? (
                            <div className="space-y-2">
                              {hourJobs.map((job) => {
                                const StatusIcon = getStatusIcon(job.status);
                                return (
                                  <div
                                    key={job.id}
                                    className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg hover:shadow-lg transition-all duration-200"
                                  >
                                    <div className="flex items-center justify-between mb-2">
                                      <div className="flex items-center space-x-2">
                                        <StatusIcon className="h-4 w-4 text-blue-600" />
                                        <span className="text-sm font-semibold text-blue-900">
                                          {formatTime(job.start_time)} - {formatTime(job.end_time)}
                                        </span>
                                      </div>
                                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(job.status)}`}>
                                        {job.status}
                                      </span>
                                    </div>
                                    <div className="text-lg font-semibold text-gray-900 mb-1">
                                      {job.title}
                                    </div>
                                    <div className="text-sm text-gray-600 mb-2">
                                      {job.client_name}
                                    </div>
                                    {job.location && (
                                      <div className="text-sm text-gray-500 flex items-center">
                                        <MapPin className="h-4 w-4 mr-1" />
                                        {job.location}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="h-16 border-l-2 border-dashed border-gray-200 ml-4"></div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Jobs List */}
          <div className="mt-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-900">Upcoming Jobs</h3>
              <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm">
                  <Filter className="h-4 w-4 mr-2" />
                  Filter
                </Button>
                <Button variant="outline" size="sm">
                  <Search className="h-4 w-4 mr-2" />
                  Search
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {jobs.slice(0, 6).map((job) => {
                const StatusIcon = getStatusIcon(job.status);
                return (
                  <Card key={job.id} className="group border-0 shadow-xl hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 bg-gradient-to-br from-white to-gray-50 overflow-hidden">
                    <div className="relative">
                      {/* Status Bar */}
                      <div className={`h-1 w-full ${
                        job.status === 'Scheduled' ? 'bg-blue-500' :
                        job.status === 'In Progress' ? 'bg-yellow-500' :
                        job.status === 'Completed' ? 'bg-green-500' : 'bg-red-500'
                      }`}></div>
                      
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center space-x-3">
                            <div className="p-3 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-xl shadow-lg">
                              <Calendar className="h-6 w-6 text-blue-600" />
                            </div>
                            <div>
                              <h3 className="font-bold text-gray-900 text-lg group-hover:text-blue-600 transition-colors">
                                {job.title}
                              </h3>
                              <p className="text-sm text-gray-600 font-medium">{job.client_name}</p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <StatusIcon className="h-4 w-4" />
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold shadow-sm ${getStatusColor(job.status)}`}>
                              {job.status}
                            </span>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <span className="text-sm font-medium text-gray-600">Time</span>
                            <span className="font-bold text-gray-900 text-sm">
                              {formatTime(job.start_time)} - {formatTime(job.end_time)}
                            </span>
                          </div>
                          
                          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <span className="text-sm font-medium text-gray-600">Duration</span>
                            <span className="font-bold text-gray-900 text-sm">{job.estimated_duration}h</span>
                          </div>

                          {job.location && (
                            <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                              <MapPin className="h-4 w-4 mr-2 text-gray-500" />
                              <span className="text-sm text-gray-600 truncate">{job.location}</span>
                            </div>
                          )}

                          {job.description && (
                            <div className="p-3 bg-gray-50 rounded-lg">
                              <p className="text-sm text-gray-600 line-clamp-2">{job.description}</p>
                            </div>
                          )}

                          {job.team_members && job.team_members.length > 0 && (
                            <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                              <Users className="h-4 w-4 mr-2 text-gray-500" />
                              <span className="text-sm text-gray-600">
                                {job.team_members.join(', ')}
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="mt-6 pt-4 border-t border-gray-200">
                          <div className="flex items-center justify-between">
                            <Link href={`/jobs/${job.id}`}>
                              <Button variant="outline" size="sm" className="hover:bg-blue-50 hover:border-blue-200 transition-colors">
                                <Edit className="h-4 w-4 mr-2" />
                                View Details
                              </Button>
                            </Link>
                            <div className="flex space-x-2">
                              <Button variant="ghost" size="sm" className="hover:bg-green-50 hover:text-green-600 transition-colors">
                                <Phone className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm" className="hover:bg-blue-50 hover:text-blue-600 transition-colors">
                                <Mail className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>

          {jobs.length === 0 && (
            <div className="text-center py-16">
              <div className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-6">
                <Calendar className="h-12 w-12 text-blue-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">No jobs scheduled</h3>
              <p className="text-gray-600 mb-8 max-w-md mx-auto">
                Start building your schedule by creating your first job. 
                You can assign team members, set locations, and track progress.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button onClick={() => setShowAddJob(true)} size="lg" className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
                  <Plus className="h-5 w-5 mr-2" />
                  Schedule Your First Job
                </Button>
                <Button variant="outline" size="lg">
                  <Users className="h-5 w-5 mr-2" />
                  Add Team Members
                </Button>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Job Creation Modal */}
      <JobCreationModal
        isOpen={showAddJob}
        onClose={() => setShowAddJob(false)}
        onJobCreated={handleJobCreated}
      />
    </div>
  );
}
