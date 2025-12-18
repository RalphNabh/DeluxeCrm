"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  MapPin,
  Clock,
  CheckCircle,
  AlertTriangle,
  Camera,
  Phone,
  Mail,
  Navigation,
  Play,
  Pause,
  Square,
  Upload,
  Download,
  LogOut
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import SignOutButton from "@/components/auth/sign-out";
import { formatCurrencyWithSymbol } from "@/lib/utils/currency";

interface FieldJob {
  id: string;
  title: string;
  client_name: string;
  client_phone: string;
  client_email: string;
  start_time: string;
  end_time: string;
  status: 'Scheduled' | 'In Progress' | 'Completed' | 'Cancelled';
  location: string;
  description?: string;
  estimated_duration?: number;
  team_members?: string[];
  equipment?: string[];
  notes?: string;
  photos?: string[];
}

export default function MobilePage() {
  const [jobs, setJobs] = useState<FieldJob[]>([]);
  const [currentJob, setCurrentJob] = useState<FieldJob | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeTracking, setTimeTracking] = useState({
    isRunning: false,
    startTime: null as Date | null,
    elapsedTime: 0
  });

  useEffect(() => {
    fetchFieldJobs();
    
    // Update elapsed time every second when tracking
    const interval = setInterval(() => {
      if (timeTracking.isRunning && timeTracking.startTime) {
        setTimeTracking(prev => ({
          ...prev,
          elapsedTime: Math.floor((Date.now() - prev.startTime!.getTime()) / 1000)
        }));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [timeTracking.isRunning, timeTracking.startTime]);

  const fetchFieldJobs = async () => {
    try {
      setLoading(true);
      
      // Simulate API call - in real app, fetch from your API
      const mockJobs: FieldJob[] = [
        {
          id: "1",
          title: "Lawn Maintenance - Smith Residence",
          client_name: "John Smith",
          client_phone: "(555) 123-4567",
          client_email: "john@smith.com",
          start_time: "2024-01-15T09:00:00Z",
          end_time: "2024-01-15T11:00:00Z",
          status: "Scheduled",
          location: "123 Main St, City, State",
          description: "Weekly lawn care and maintenance",
          estimated_duration: 2,
          team_members: ["Mike Johnson", "Sarah Wilson"],
          equipment: ["Mower", "Trimmer", "Blower"],
          notes: "Gate code: 1234. Park in driveway."
        },
        {
          id: "2",
          title: "Tree Trimming - Johnson Office",
          client_name: "Jane Johnson",
          client_phone: "(555) 987-6543",
          client_email: "jane@johnson.com",
          start_time: "2024-01-15T13:00:00Z",
          end_time: "2024-01-15T17:00:00Z",
          status: "In Progress",
          location: "456 Business Ave, City, State",
          description: "Trim oak tree in parking lot",
          estimated_duration: 4,
          team_members: ["Mike Johnson"],
          equipment: ["Chainsaw", "Ladder", "Safety Gear"],
          notes: "Security will let you in. Ask for Bob."
        }
      ];

      setJobs(mockJobs);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch jobs');
    } finally {
      setLoading(false);
    }
  };

  const updateJobStatus = async (jobId: string, status: FieldJob['status']) => {
    try {
      setJobs(prev => prev.map(job => 
        job.id === jobId ? { ...job, status } : job
      ));
      
      if (status === 'In Progress') {
        setCurrentJob(jobs.find(job => job.id === jobId) || null);
      } else if (status === 'Completed') {
        setCurrentJob(null);
        setTimeTracking({ isRunning: false, startTime: null, elapsedTime: 0 });
      }
    } catch (err) {
      console.error('Error updating job status:', err);
    }
  };

  const startTimeTracking = () => {
    setTimeTracking({
      isRunning: true,
      startTime: new Date(),
      elapsedTime: 0
    });
  };

  const stopTimeTracking = () => {
    setTimeTracking({
      isRunning: false,
      startTime: null,
      elapsedTime: 0
    });
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
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
      case 'Cancelled': return AlertTriangle;
      default: return Clock;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading field jobs...</p>
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
          <Button onClick={fetchFieldJobs}>Try Again</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Avatar className="h-8 w-8">
                <AvatarFallback>JD</AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium text-gray-900">John Doe</p>
                <p className="text-xs text-gray-500">Field Worker</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="ghost" size="sm">
                <Bell className="h-4 w-4" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <User className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard">Dashboard</Link>
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
        </div>
      </header>

      {/* Current Job (if any) */}
      {currentJob && (
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Current Job</h2>
            <span className="px-3 py-1 bg-white/20 rounded-full text-sm font-medium">
              In Progress
            </span>
          </div>
          <h3 className="text-xl font-bold mb-2">{currentJob.title}</h3>
          <p className="text-blue-100 mb-3">{currentJob.client_name}</p>
          
          {/* Time Tracking */}
          <div className="bg-white/20 rounded-lg p-3 mb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-100">Time Tracking</p>
                <p className="text-2xl font-bold">
                  {formatTime(timeTracking.elapsedTime)}
                </p>
              </div>
              <div className="flex space-x-2">
                {!timeTracking.isRunning ? (
                  <Button 
                    onClick={startTimeTracking}
                    size="sm"
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Play className="h-4 w-4 mr-1" />
                    Start
                  </Button>
                ) : (
                  <Button 
                    onClick={stopTimeTracking}
                    size="sm"
                    className="bg-red-600 hover:bg-red-700"
                  >
                    <Pause className="h-4 w-4 mr-1" />
                    Stop
                  </Button>
                )}
              </div>
            </div>
          </div>

          <div className="flex space-x-2">
            <Button 
              onClick={() => updateJobStatus(currentJob.id, 'Completed')}
              size="sm"
              className="bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="h-4 w-4 mr-1" />
              Complete Job
            </Button>
            <Button 
              onClick={() => setCurrentJob(null)}
              size="sm"
              variant="outline"
              className="border-white/30 text-white hover:bg-white/20"
            >
              <Square className="h-4 w-4 mr-1" />
              Pause
            </Button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="p-4">
        {/* Today's Jobs */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Today's Jobs</h2>
          <div className="space-y-4">
            {jobs.map((job) => {
              const StatusIcon = getStatusIcon(job.status);
              return (
                <Card key={job.id} className="border-0 shadow-lg">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <Calendar className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{job.title}</h3>
                          <p className="text-sm text-gray-600">{job.client_name}</p>
                        </div>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(job.status)}`}>
                        {job.status}
                      </span>
                    </div>

                    <div className="space-y-2 mb-4">
                      <div className="flex items-center text-sm text-gray-600">
                        <MapPin className="h-4 w-4 mr-2" />
                        <span className="truncate">{job.location}</span>
                      </div>
                      
                      <div className="flex items-center text-sm text-gray-600">
                        <Clock className="h-4 w-4 mr-2" />
                        <span>
                          {new Date(job.start_time).toLocaleTimeString('en-US', {
                            hour: 'numeric',
                            minute: '2-digit',
                            hour12: true
                          })} - {new Date(job.end_time).toLocaleTimeString('en-US', {
                            hour: 'numeric',
                            minute: '2-digit',
                            hour12: true
                          })}
                        </span>
                      </div>

                      {job.team_members && job.team_members.length > 0 && (
                        <div className="text-sm text-gray-600">
                          <span className="font-medium">Team: </span>
                          {job.team_members.join(', ')}
                        </div>
                      )}

                      {job.equipment && job.equipment.length > 0 && (
                        <div className="text-sm text-gray-600">
                          <span className="font-medium">Equipment: </span>
                          {job.equipment.join(', ')}
                        </div>
                      )}

                      {job.notes && (
                        <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                          <span className="font-medium">Notes: </span>
                          {job.notes}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                      <div className="flex space-x-2">
                        <Button variant="ghost" size="sm">
                          <Phone className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Mail className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Navigation className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      <div className="flex space-x-2">
                        {job.status === 'Scheduled' && (
                          <Button 
                            onClick={() => updateJobStatus(job.id, 'In Progress')}
                            size="sm"
                            className="bg-blue-600 hover:bg-blue-700"
                          >
                            Start Job
                          </Button>
                        )}
                        {job.status === 'In Progress' && (
                          <Button 
                            onClick={() => updateJobStatus(job.id, 'Completed')}
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                          >
                            Complete
                          </Button>
                        )}
                        {job.status === 'Completed' && (
                          <Button 
                            size="sm"
                            variant="outline"
                            disabled
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Completed
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-4">
          <Button className="h-16 bg-gradient-to-r from-blue-600 to-indigo-600">
            <Camera className="h-5 w-5 mr-2" />
            <div className="text-left">
              <div className="text-sm font-medium">Take Photo</div>
              <div className="text-xs opacity-90">Document work</div>
            </div>
          </Button>
          
          <Button className="h-16 bg-gradient-to-r from-green-600 to-emerald-600">
            <Upload className="h-5 w-5 mr-2" />
            <div className="text-left">
              <div className="text-sm font-medium">Upload</div>
              <div className="text-xs opacity-90">Share files</div>
            </div>
          </Button>
        </div>
      </main>
    </div>
  );
}


