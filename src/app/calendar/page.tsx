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
  Trash2,
  Eye,
  Tag,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import SignOutButton from "@/components/auth/sign-out";
import UserProfile from "@/components/layout/user-profile";
import PageSidebar from "@/components/layout/page-sidebar";
import JobCreationModal from "@/components/jobs/job-creation-modal";
import JobEditModal from "@/components/jobs/job-edit-modal";
import { calculateEventPositions, type PositionedEvent } from "@/lib/utils/calendar-overlap";

const sidebarItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
  { icon: Users, label: "Clients", href: "/clients" },
  { icon: FileText, label: "Estimates", href: "/estimates" },
  { icon: DollarSign, label: "Invoices", href: "/invoices" },
  { icon: Calendar, label: "Calendar", href: "/calendar", active: true },
  { icon: CheckSquare, label: "Tasks", href: "/tasks" },
  { icon: BarChart3, label: "Reports", href: "/reports" },
  { icon: Users, label: "Team", href: "/team" },
  { icon: Zap, label: "Automations", href: "/automations" },
  { icon: Gift, label: "Affiliates", href: "/affiliates" },
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
  tags?: string[];
  estimate_id?: string;
  estimates?: {
    id: string;
    status: string;
    total: number;
    created_at: string;
  } | null;
}

export default function CalendarPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [view, setView] = useState<'month' | 'week' | 'day'>('week');
  const [showAddJob, setShowAddJob] = useState(false);
  const [showEditJob, setShowEditJob] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
      
      // Extract all unique tags from jobs
      const allTags = new Set<string>();
      data.forEach((job: Job) => {
        if (job.tags && Array.isArray(job.tags)) {
          job.tags.forEach(tag => allTags.add(tag));
        }
      });
      setAvailableTags(Array.from(allTags).sort());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch jobs');
    } finally {
      setLoading(false);
    }
  };

  const handleJobCreated = (newJob: Job) => {
    setJobs(prev => [...prev, newJob]);
  };

  const handleJobUpdated = (updatedJob: Job) => {
    // Refresh the jobs list to ensure we have the latest data
    fetchJobs();
    setSelectedJob(null);
  };

  const handleEditJob = (job: Job) => {
    setSelectedJob(job);
    setShowEditJob(true);
  };

  const getJobsForDate = (date: Date) => {
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);
    
    return jobs.filter(job => {
      // Exclude completed jobs from calendar views
      if (job.status === 'Completed') return false;
      
      // Filter by tag if selected
      if (selectedTag && (!job.tags || !Array.isArray(job.tags) || !job.tags.includes(selectedTag))) {
        return false;
      }
      
      const startDate = new Date(job.start_time);
      const endDate = new Date(job.end_time);
      
      // Set times to midnight for date comparison
      const jobStartDate = new Date(startDate);
      jobStartDate.setHours(0, 0, 0, 0);
      
      const jobEndDate = new Date(endDate);
      jobEndDate.setHours(0, 0, 0, 0);
      
      // Check if the date falls within the job's date range (inclusive)
      return checkDate >= jobStartDate && checkDate <= jobEndDate;
    });
  };

  const getJobsForWeek = (date: Date) => {
    const startOfWeek = new Date(date);
    startOfWeek.setDate(date.getDate() - date.getDay());
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    
    return jobs.filter(job => {
      // Exclude completed jobs from calendar views
      if (job.status === 'Completed') return false;
      
      const jobDate = new Date(job.start_time);
      return jobDate >= startOfWeek && jobDate <= endOfWeek;
    });
  };

  // Calculate the time range needed for the week view
  const getWeekTimeRange = () => {
    const weekJobs = getJobsForWeek(selectedDate);
    if (weekJobs.length === 0) {
      return { startHour: 6, endHour: 22 }; // Default 6 AM to 10 PM
    }

    let earliestHour = 23;
    let latestHour = 0;

    weekJobs.forEach(job => {
      const startDate = new Date(job.start_time);
      const endDate = new Date(job.end_time);
      const startHour = startDate.getHours();
      const endHour = endDate.getHours();
      
      if (startHour < earliestHour) earliestHour = startHour;
      if (endHour > latestHour) latestHour = endHour;
    });

    // Add padding: 1 hour before earliest, 1 hour after latest
    const startHour = Math.max(0, earliestHour - 1);
    const endHour = Math.min(23, latestHour + 1);

    return { startHour, endHour };
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

  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(selectedDate);
    
    if (view === 'day') {
      newDate.setDate(selectedDate.getDate() + (direction === 'next' ? 1 : -1));
    } else if (view === 'week') {
      newDate.setDate(selectedDate.getDate() + (direction === 'next' ? 7 : -7));
    } else if (view === 'month') {
      newDate.setMonth(selectedDate.getMonth() + (direction === 'next' ? 1 : -1));
    }
    
    setSelectedDate(newDate);
  };

  const goToToday = () => {
    setSelectedDate(new Date());
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
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Calendar</h1>
              <p className="text-gray-600 mt-1">Schedule and manage your jobs and appointments.</p>
            </div>
            
            <div className="flex items-center space-x-4">
              {availableTags.length > 0 && (
                <Select value={selectedTag || "all"} onValueChange={(value) => setSelectedTag(value === "all" ? null : value)}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filter by tag" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Tags</SelectItem>
                    {availableTags.map((tag) => (
                      <SelectItem key={tag} value={tag}>
                        <div className="flex items-center">
                          <Tag className="h-3 w-3 mr-2" />
                          {tag}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigateDate('prev')}
                >
                  ←
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToToday}
                >
                  Today
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigateDate('next')}
                >
                  →
                </Button>
              </div>
              
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
                  {getWeekDays().map((day, index) => {
                    const isToday = day.toDateString() === new Date().toDateString();
                    return (
                      <div 
                        key={index} 
                        className={`p-6 border-r border-blue-500/20 text-center ${
                          isToday ? 'bg-blue-500/20 border-blue-400' : ''
                        }`}
                      >
                        <div className={`text-sm font-medium opacity-90 mb-1 ${
                          isToday ? 'text-blue-100 font-semibold' : ''
                        }`}>
                          {day.toLocaleDateString('en-US', { weekday: 'short' })}
                        </div>
                        <div className={`text-2xl font-bold ${
                          isToday ? 'text-blue-100' : ''
                        }`}>
                          {day.getDate()}
                        </div>
                        <div className={`text-xs opacity-75 mt-1 ${
                          isToday ? 'text-blue-100' : ''
                        }`}>
                          {day.toLocaleDateString('en-US', { month: 'short' })}
                        </div>
                        {isToday && (
                          <div className="text-xs text-blue-100 font-medium mt-1">Today</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
              
              {/* Week Body */}
              {(() => {
                const { startHour, endHour } = getWeekTimeRange();
                const hoursCount = endHour - startHour + 1;
                const totalHeight = hoursCount * 50;
                
                return (
                  <div className="grid grid-cols-8 overflow-y-auto max-h-[calc(100vh-300px)]" style={{ minHeight: '600px' }}>
                    <div className="p-4 border-r bg-gray-50/50 relative sticky left-0 z-10">
                      <div className="space-y-0">
                        {Array.from({ length: hoursCount }, (_, i) => {
                          const hour = startHour + i;
                          return (
                            <div 
                              key={hour} 
                              className="text-xs text-gray-500 font-medium h-[50px] flex items-start pt-1"
                            >
                              {hour === 0 ? '12:00 AM' : hour === 12 ? '12:00 PM' : hour > 12 ? `${hour - 12}:00 PM` : `${hour}:00 AM`}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    {getWeekDays().map((day, dayIndex) => {
                      const isToday = day.toDateString() === new Date().toDateString();
                      return (
                        <div 
                          key={dayIndex} 
                          className={`border-r relative pt-1 ${
                            isToday ? 'bg-blue-50/40' : 'bg-white'
                          }`}
                          style={{ minHeight: `${totalHeight}px` }}
                        >
                          {(() => {
                            const dayJobs = getJobsForDate(day);
                            const positionedJobs = calculateEventPositions(dayJobs);
                            
                            return positionedJobs.map((positionedJob) => {
                              const job = positionedJob as Job & PositionedEvent;
                              const StatusIcon = getStatusIcon(job.status);
                              const startDate = new Date(job.start_time);
                              const endDate = new Date(job.end_time);
                              
                              // Use the start time and end time from the job for display
                              // This shows the same time range on each day the job spans
                              const startHour_job = startDate.getHours();
                              const startMinute = startDate.getMinutes();
                              const endHour_job = endDate.getHours();
                              const endMinute = endDate.getMinutes();
                              
                              // Calculate duration in hours: from start time to end time
                              const startTimeMinutes = startHour_job * 60 + startMinute;
                              const endTimeMinutes = endHour_job * 60 + endMinute;
                              const durationHours = (endTimeMinutes - startTimeMinutes) / 60;
                              
                              // Calculate position relative to startHour (not 0)
                              const topPosition = (startHour_job - startHour) * 50 + (startMinute / 60) * 50;
                              
                              // Calculate left position and width based on overlap
                              // Account for padding (8px total = 4px on each side)
                              const padding = 4; // px on each side
                              const leftPercent = job.left;
                              const widthPercent = job.width;
                          
                              return (
                                <div
                                  key={job.id}
                                  className="absolute p-2 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105 group"
                                  style={{ 
                                    top: `${topPosition}px`, 
                                    height: `${durationHours * 50}px`,
                                    left: `calc(${leftPercent}% + ${padding}px)`,
                                    width: `calc(${widthPercent}% - ${padding * 2}px)`,
                                  }}
                                  onClick={() => handleEditJob(job)}
                                >
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center space-x-2">
                                <StatusIcon className="h-3 w-3 text-blue-600" />
                                <span className="text-xs font-semibold text-blue-900">
                                  {formatTime(job.start_time)}
                                </span>
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditJob(job);
                                }}
                                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-blue-200 rounded"
                                title="Edit job"
                              >
                                <Edit className="h-3 w-3 text-blue-600" />
                              </button>
                            </div>
                            <div className="flex items-center space-x-1 mb-1">
                              <div className="text-sm font-semibold text-gray-900 truncate flex-1">
                                {job.title}
                              </div>
                              {job.estimate_id && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800" title="Has linked estimate">
                                  <FileText className="h-2.5 w-2.5" />
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-gray-600 truncate">
                              {job.client_name}
                            </div>
                            {job.tags && job.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {job.tags.slice(0, 2).map((tag, idx) => (
                                  <span
                                    key={idx}
                                    className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
                                  >
                                    <Tag className="h-2 w-2 mr-0.5" />
                                    {tag}
                                  </span>
                                ))}
                                {job.tags.length > 2 && (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                                    +{job.tags.length - 2}
                                  </span>
                                )}
                              </div>
                            )}
                            {job.location && (
                              <div className="text-xs text-gray-500 truncate mt-1">
                                📍 {job.location}
                              </div>
                            )}
                          </div>
                        );
                            });
                          })()}
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
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
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-white hover:bg-white/20"
                      onClick={() => navigateDate('prev')}
                    >
                      ←
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-white hover:bg-white/20"
                      onClick={() => navigateDate('next')}
                    >
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
                      className={`p-3 border-r border-b min-h-[120px] relative ${
                        isCurrentMonth ? 'bg-white' : 'bg-gray-50'
                      } ${isToday ? 'bg-blue-50 border-2 border-blue-500' : ''}`}
                    >
                      {isToday && (
                        <div className="absolute top-2 right-2 w-2 h-2 bg-blue-500 rounded-full"></div>
                      )}
                      <div className={`text-sm font-medium mb-2 ${
                        isCurrentMonth ? 'text-gray-900' : 'text-gray-400'
                      } ${isToday ? 'text-blue-700 font-bold' : ''}`}>
                        {date.getDate()}
                      </div>
                      <div className="space-y-1 relative">
                        {(() => {
                          const positionedJobs = calculateEventPositions(dayJobs.slice(0, 6));
                          return positionedJobs.slice(0, 3).map((positionedJob) => {
                            const job = positionedJob as Job & PositionedEvent;
                            const StatusIcon = getStatusIcon(job.status);
                            return (
                              <div
                                key={job.id}
                                className="p-2 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded text-xs cursor-pointer hover:shadow-md transition-all group relative"
                                onClick={() => handleEditJob(job)}
                                style={{
                                  width: `${job.width}%`,
                                  marginLeft: `${job.left}%`,
                                  display: 'inline-block'
                                }}
                              >
                                <div className="flex items-center justify-between mb-1">
                                  <div className="flex items-center space-x-1">
                                    <StatusIcon className="h-2 w-2 text-blue-600" />
                                    <span className="font-medium text-blue-900">
                                      {formatTime(job.start_time)}
                                    </span>
                                  </div>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleEditJob(job);
                                    }}
                                    className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-blue-200 rounded"
                                    title="Edit job"
                                  >
                                    <Edit className="h-2.5 w-2.5 text-blue-600" />
                                  </button>
                                </div>
                                <div className="flex items-center space-x-1">
                                  <div className="text-gray-900 truncate font-medium flex-1">
                                    {job.title}
                                  </div>
                                  {job.estimate_id && (
                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800" title="Has linked estimate">
                                      <FileText className="h-2.5 w-2.5" />
                                    </span>
                                  )}
                                </div>
                                <div className="text-gray-600 truncate">
                                  {job.client_name}
                                </div>
                                {job.tags && job.tags.length > 0 && (
                                  <div className="flex flex-wrap gap-0.5 mt-1">
                                    {job.tags.slice(0, 1).map((tag, idx) => (
                                      <span
                                        key={idx}
                                        className="inline-flex items-center px-1 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
                                      >
                                        <Tag className="h-1.5 w-1.5 mr-0.5" />
                                        {tag}
                                      </span>
                                    ))}
                                    {job.tags.length > 1 && (
                                      <span className="inline-flex items-center px-1 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                                        +{job.tags.length - 1}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          });
                        })()}
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
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-white hover:bg-white/20"
                      onClick={() => navigateDate('prev')}
                    >
                      ←
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-white hover:bg-white/20"
                      onClick={() => navigateDate('next')}
                    >
                      →
                    </Button>
                  </div>
                </div>
              </div>

              {/* Day Timeline */}
              <div className="p-6">
                <div className="space-y-4">
                  {(() => {
                    const dayJobs = getJobsForDate(selectedDate);
                    // Calculate time range for day view based on jobs
                    let minHour = 23;
                    let maxHour = 0;
                    
                    dayJobs.forEach(job => {
                      const startDate = new Date(job.start_time);
                      const endDate = new Date(job.end_time);
                      const startHour = startDate.getHours();
                      const endHour = endDate.getHours();
                      
                      if (startHour < minHour) minHour = startHour;
                      if (endHour > maxHour) maxHour = endHour;
                    });
                    
                    const startHour = dayJobs.length > 0 ? Math.max(0, minHour - 1) : 8;
                    const endHour = dayJobs.length > 0 ? Math.min(23, maxHour + 1) : 19;
                    const hoursCount = endHour - startHour + 1;
                    
                    return Array.from({ length: hoursCount }, (_, i) => {
                      const hour = startHour + i;
                      const now = new Date();
                      const isCurrentDay = selectedDate.toDateString() === now.toDateString();
                      const isCurrentHour = isCurrentDay && hour === now.getHours();
                      const currentMinute = now.getMinutes();
                      const hourJobs = dayJobs.filter(job => {
                        const startDate = new Date(job.start_time);
                        const endDate = new Date(job.end_time);
                        const jobStartHour = startDate.getHours();
                        const jobEndHour = endDate.getHours();
                        // Show job if this hour falls within the job's time range
                        return hour >= jobStartHour && hour <= jobEndHour;
                      });
                      
                      // Get jobs that start at this hour
                      const startingJobs = hourJobs.filter(job => {
                        const startDate = new Date(job.start_time);
                        return startDate.getHours() === hour;
                      });
                      
                      // Calculate positions for overlapping jobs
                      const positionedJobs = calculateEventPositions(startingJobs);
                    
                    return (
                      <div key={hour} className="flex relative">
                        {/* Current time indicator line */}
                        {isCurrentHour && (
                          <div 
                            className="absolute left-0 right-0 z-10 flex items-center pointer-events-none"
                            style={{ top: `${(currentMinute / 60) * 80}px` }}
                          >
                            <div className="flex items-center w-full">
                              <div className="w-20 flex items-center">
                                <div className="w-2.5 h-2.5 bg-orange-500 rounded-full border-2 border-white shadow-md"></div>
                                <div className="ml-2 text-xs font-semibold text-orange-600 bg-white px-1.5 py-0.5 rounded">
                                  Now
                                </div>
                              </div>
                              <div className="flex-1 h-0.5 bg-orange-500 ml-4"></div>
                            </div>
                          </div>
                        )}
                        <div className={`w-20 text-sm font-medium pt-2 ${
                          isCurrentHour ? 'text-orange-600 font-bold' : 'text-gray-500'
                        }`}>
                          {hour === 12 ? '12:00 PM' : hour > 12 ? `${hour - 12}:00 PM` : `${hour}:00 AM`}
                        </div>
                        <div className="flex-1 ml-4 relative">
                          {positionedJobs.length > 0 ? (
                            <div className="relative">
                              {positionedJobs.map((positionedJob) => {
                                const job = positionedJob as Job & PositionedEvent;
                                const StatusIcon = getStatusIcon(job.status);
                                const startDate = new Date(job.start_time);
                                const endDate = new Date(job.end_time);
                                
                                return (
                                  <div
                                    key={job.id}
                                    className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg hover:shadow-lg transition-all duration-200 group relative mb-2"
                                    style={{
                                      width: `${job.width}%`,
                                      marginLeft: `${job.left}%`,
                                      display: 'inline-block',
                                      verticalAlign: 'top'
                                    }}
                                  >
                                    <div className="flex items-center justify-between mb-2">
                                      <div className="flex items-center space-x-2">
                                        <StatusIcon className="h-4 w-4 text-blue-600" />
                                        <span className="text-sm font-semibold text-blue-900">
                                          {formatTime(job.start_time)} - {formatTime(job.end_time)}
                                        </span>
                                      </div>
                                      <div className="flex items-center space-x-2">
                                        <button
                                          onClick={() => handleEditJob(job)}
                                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-blue-200 rounded"
                                          title="Edit job"
                                        >
                                          <Edit className="h-4 w-4 text-blue-600" />
                                        </button>
                                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(job.status)}`}>
                                          {job.status}
                                        </span>
                                      </div>
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
                                    {job.tags && job.tags.length > 0 && (
                                      <div className="flex flex-wrap gap-1 mt-2">
                                        {job.tags.slice(0, 3).map((tag, idx) => (
                                          <span
                                            key={idx}
                                            className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
                                          >
                                            <Tag className="h-2.5 w-2.5 mr-1" />
                                            {tag}
                                          </span>
                                        ))}
                                        {job.tags.length > 3 && (
                                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                                            +{job.tags.length - 3}
                                          </span>
                                        )}
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
                  })})()}
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
              {jobs
                .sort((a, b) => {
                  // Sort by start time, upcoming first, then completed
                  const dateA = new Date(a.start_time).getTime();
                  const dateB = new Date(b.start_time).getTime();
                  if (a.status === 'Completed' && b.status !== 'Completed') return 1;
                  if (a.status !== 'Completed' && b.status === 'Completed') return -1;
                  return dateA - dateB;
                })
                .slice(0, 6)
                .map((job) => {
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
                            <div className="flex-1">
                              <div className="flex items-center space-x-2">
                                <h3 className="font-bold text-gray-900 text-lg group-hover:text-blue-600 transition-colors">
                                  {job.title}
                                </h3>
                                {job.estimate_id && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800" title="Has linked estimate">
                                    <FileText className="h-3 w-3 mr-1" />
                                    Estimate
                                  </span>
                                )}
                              </div>
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
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                              </Button>
                            </Link>
                            <div className="flex space-x-2">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="hover:bg-blue-50 hover:border-blue-200 transition-colors"
                                onClick={() => handleEditJob(job)}
                              >
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </Button>
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

      {/* Job Edit Modal */}
      <JobEditModal
        isOpen={showEditJob}
        onClose={() => {
          setShowEditJob(false);
          setSelectedJob(null);
        }}
        onJobUpdated={handleJobUpdated}
        job={selectedJob}
      />
    </div>
  );
}
