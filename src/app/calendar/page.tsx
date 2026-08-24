"use client";

import { useState, useMemo, useEffect } from "react";
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
  Gift
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
import JobCreationModal from "@/components/jobs/job-creation-modal";
import JobEditModal from "@/components/jobs/job-edit-modal";
import { DndContext, useDroppable, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { DraggableJobCard } from "@/components/calendar/draggable-job-card";
import {
  calculateEventPositions,
  firstAssigneeUserId,
  getCompletedClasses,
  getJobCardAppearance,
  getJobColor,
  getLayoutStyle,
  type JobAssignment,
  type PositionedEvent,
} from "@/lib/utils/calendar-overlap";
import { useJobsQuery, useVisitsQuery, useTeamQuery, useInvalidateQueries } from "@/lib/query/hooks";
import { CalendarSkeleton } from "@/components/ui/page-skeletons";
import { CalendarPreferencesPanel } from "@/components/calendar/calendar-preferences-panel";
import {
  DEFAULT_CALENDAR_PREFERENCES,
  hasCalendarPreferences,
  loadCalendarPreferences,
  saveCalendarPreferences,
  type CalendarPreferences,
} from "@/lib/calendar-preferences";

/** Local YYYY-MM-DD key, used to pair a dragged card with its drop-target day column. */
function localDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

const MIN_VISIT_DURATION_MINUTES = 15;

/** Snap a delta in px to the nearest 15 minutes, given how many px = 1 hour. */
function pxDeltaToSnappedMinutes(deltaPx: number, pxPerHour: number): number {
  const deltaMinutes = (deltaPx / pxPerHour) * 60;
  return Math.round(deltaMinutes / MIN_VISIT_DURATION_MINUTES) * MIN_VISIT_DURATION_MINUTES;
}

interface Job {
  id: string;
  title: string;
  client_id: string;
  client_name: string;
  start_time: string;
  end_time: string;
  status: 'Scheduled' | 'In Progress' | 'Completed' | 'Cancelled' | string;
  location: string;
  description?: string;
  estimated_duration: number; // in hours
  actual_duration?: number;
  team_members?: string[];
  equipment?: string[];
  notes?: string;
  tags?: string[];
  estimate_id?: string;
  job_id?: string;
  visit_id?: string;
  job_assignments?: JobAssignment[];
  estimates?: {
    id: string;
    status: string;
    total: number;
    created_at: string;
  } | null;
}

function getStatusColor(status: string) {
  switch (status) {
    case 'Scheduled': return 'bg-blue-100 text-blue-800';
    case 'In Progress': return 'bg-yellow-100 text-yellow-800';
    case 'Completed': return 'bg-green-100 text-green-800';
    case 'Cancelled': return 'bg-red-100 text-red-800';
    default: return 'bg-gray-100 text-gray-800';
  }
}

function getStatusIcon(status: string) {
  switch (status) {
    case 'Scheduled': return Clock;
    case 'In Progress': return AlertTriangle;
    case 'Completed': return CheckCircle;
    case 'Cancelled': return Trash2;
    default: return Clock;
  }
}

function formatTime(timeString: string) {
  return new Date(timeString).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

function mapVisitStatus(status: string): string {
  switch (status) {
    case 'completed':
      return 'Completed';
    case 'cancelled':
      return 'Cancelled';
    case 'skipped':
      return 'Cancelled';
    default:
      return 'Scheduled';
  }
}

function visitsToCalendarJobs(visits: unknown[]): Job[] {
  return (visits as Array<Record<string, unknown>>).map((visit) => {
    const job = visit.jobs as Record<string, unknown> | null | undefined;
    return {
      id: String(visit.id),
      visit_id: String(visit.id),
      job_id: String(visit.job_id ?? job?.id ?? ''),
      title: String(visit.title ?? job?.title ?? 'Visit'),
      client_id: String(job?.client_id ?? ''),
      client_name: String(visit.client_name ?? 'Unknown Client'),
      start_time: String(visit.scheduled_start),
      end_time: String(visit.scheduled_end),
      status: mapVisitStatus(String(visit.status ?? 'scheduled')),
      location: String(visit.location ?? job?.location ?? ''),
      description: (job?.description as string) || undefined,
      estimated_duration: Number(job?.estimated_duration ?? 0),
      team_members: (job?.team_members as string[]) || undefined,
      equipment: (job?.equipment as string[]) || undefined,
      notes: (visit.notes as string) || undefined,
      tags: (visit.tags as string[]) || (job?.tags as string[]) || [],
      job_assignments: (job?.job_assignments as JobAssignment[]) || undefined,
    };
  });
}

const WEEK_HOUR_PX = 50;

/**
 * One day column in Week view. A droppable target (for dragging jobs between
 * days) that also renders each job as a draggable/resizable card - pulled out
 * of the page component so useDroppable's hook call isn't inside a .map().
 */
function WeekDayColumn({
  day,
  isToday,
  totalHeight,
  positionedJobs,
  startHour,
  prefs,
  colorByUserId,
  usingVisits,
  onEditJob,
  onResizeEnd,
}: {
  day: Date;
  isToday: boolean;
  totalHeight: number;
  positionedJobs: (Job & PositionedEvent)[];
  startHour: number;
  prefs: CalendarPreferences;
  colorByUserId: Map<string, string>;
  usingVisits: boolean;
  onEditJob: (job: Job) => void;
  onResizeEnd: (job: Job & PositionedEvent, deltaPx: number, pxPerHour: number) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `day:${localDateKey(day)}` });

  return (
    <div
      ref={setNodeRef}
      className={`border-r relative pt-1 ${isToday ? 'bg-blue-50/40' : 'bg-white'} ${isOver ? 'bg-blue-100/50' : ''}`}
      style={{ minHeight: `${totalHeight}px` }}
    >
      {positionedJobs.map((job) => {
        const StatusIcon = getStatusIcon(job.status);
        const startDate = new Date(job.start_time);
        const endDate = new Date(job.end_time);

        const startHour_job = startDate.getHours();
        const startMinute = startDate.getMinutes();
        const endHour_job = endDate.getHours();
        const endMinute = endDate.getMinutes();

        const startTimeMinutes = startHour_job * 60 + startMinute;
        const endTimeMinutes = endHour_job * 60 + endMinute;
        const durationHours = (endTimeMinutes - startTimeMinutes) / 60;

        const topPosition = (startHour_job - startHour) * WEEK_HOUR_PX + (startMinute / 60) * WEEK_HOUR_PX;

        const padding = 4;
        const layoutStyle = getLayoutStyle(job, prefs.appointmentLayout);
        const completed = getCompletedClasses(job.status, prefs.completedStyle);
        const color = getJobColor(firstAssigneeUserId(job.job_assignments), colorByUserId);
        const appearance = getJobCardAppearance(color);
        const draggable = usingVisits && Boolean(job.visit_id);

        return (
          <DraggableJobCard
            key={job.id}
            dragId={job.id}
            dragDisabled={!draggable}
            dragData={{ job, pxPerHour: WEEK_HOUR_PX, axis: 'vertical' }}
            className={`absolute p-2 ${appearance.cardClassName} rounded-lg cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105 group ${completed.card}`}
            style={{
              top: `${topPosition}px`,
              height: `${durationHours * WEEK_HOUR_PX}px`,
              left: `calc(${layoutStyle.left} + ${padding}px)`,
              width: `calc(${layoutStyle.width} - ${padding * 2}px)`,
              zIndex: layoutStyle.zIndex,
              ...appearance.cardStyle,
            }}
            onClick={() => onEditJob(job)}
            resize={draggable ? { axis: 'vertical', onCommit: (deltaPx) => onResizeEnd(job, deltaPx, WEEK_HOUR_PX) } : undefined}
          >
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center space-x-2">
                <StatusIcon className={`h-3 w-3 ${appearance.accentClassName}`} />
                <span className={`text-xs font-semibold ${color ? 'text-gray-900' : 'text-blue-900'}`}>
                  {formatTime(job.start_time)}
                </span>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEditJob(job);
                }}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-blue-200 rounded"
                title="Edit job"
              >
                <Edit className={`h-3 w-3 ${appearance.accentClassName}`} />
              </button>
            </div>
            <div className="flex items-center space-x-1 mb-1">
              <div className={`text-sm font-semibold text-gray-900 truncate flex-1 ${completed.title}`}>
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
          </DraggableJobCard>
        );
      })}
    </div>
  );
}

export default function CalendarPage() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [view, setView] = useState<'month' | 'week' | 'day'>('week');
  const [showAddJob, setShowAddJob] = useState(false);
  const [showEditJob, setShowEditJob] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);;
  const [prefs, setPrefs] = useState<CalendarPreferences>(DEFAULT_CALENDAR_PREFERENCES);
  const [showPrefsPanel, setShowPrefsPanel] = useState(false);
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const invalidate = useInvalidateQueries();

  const teamQuery = useTeamQuery();
  const colorByUserId = useMemo(() => {
    const map = new Map<string, string>();
    for (const member of (teamQuery.data ?? []) as Array<{ user_id?: string; calendar_color?: string }>) {
      if (member.user_id && member.calendar_color) {
        map.set(member.user_id, member.calendar_color);
      }
    }
    return map;
  }, [teamQuery.data]);

  const dndSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  async function rescheduleVisit(visitId: string, scheduledStart: string, scheduledEnd: string) {
    try {
      const res = await fetch(`/api/visits/${visitId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduled_start: scheduledStart, scheduled_end: scheduledEnd }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to reschedule job");
      }
      await invalidate.visits();
    } catch (e) {
      setScheduleError(e instanceof Error ? e.message : "Failed to reschedule job");
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    if (!usingVisits) return;
    const { active, delta, over } = event;
    const data = active.data.current as
      | { job: Job & PositionedEvent; pxPerHour: number; axis: "vertical" | "horizontal" }
      | undefined;
    if (!data || !data.job.visit_id) return;

    const deltaPx = data.axis === "horizontal" ? delta.x : delta.y;
    const overId = typeof over?.id === "string" ? over.id : null;
    const targetDateKey = overId?.startsWith("day:") ? overId.slice(4) : null;
    if (Math.abs(deltaPx) < 1 && !targetDateKey) return;

    const snappedMinutes = pxDeltaToSnappedMinutes(deltaPx, data.pxPerHour);
    const originalStart = new Date(data.job.start_time);
    const originalEnd = new Date(data.job.end_time);
    const durationMs = originalEnd.getTime() - originalStart.getTime();

    let newStart = new Date(originalStart.getTime() + snappedMinutes * 60000);
    if (targetDateKey) {
      const [y, m, d] = targetDateKey.split("-").map(Number);
      const withNewDay = new Date(newStart);
      withNewDay.setFullYear(y, m - 1, d);
      newStart = withNewDay;
    }
    const newEnd = new Date(newStart.getTime() + durationMs);

    rescheduleVisit(data.job.visit_id, newStart.toISOString(), newEnd.toISOString());
  }

  function handleResizeEnd(job: Job & PositionedEvent, deltaPx: number, pxPerHour: number) {
    if (!job.visit_id) return;
    const snappedMinutes = pxDeltaToSnappedMinutes(deltaPx, pxPerHour);
    const start = new Date(job.start_time);
    const originalEnd = new Date(job.end_time);
    const minEnd = new Date(start.getTime() + MIN_VISIT_DURATION_MINUTES * 60000);
    let newEnd = new Date(originalEnd.getTime() + snappedMinutes * 60000);
    if (newEnd < minEnd) newEnd = minEnd;

    rescheduleVisit(job.visit_id, start.toISOString(), newEnd.toISOString());
  }

  useEffect(() => {
    setPrefs(loadCalendarPreferences());
    if (!hasCalendarPreferences()) {
      setShowPrefsPanel(true);
    }
  }, []);

  const rangeFrom = useMemo(() => {
    const d = new Date(selectedDate);
    d.setMonth(d.getMonth() - 1);
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d.toISOString();
  }, [selectedDate]);

  const rangeTo = useMemo(() => {
    const d = new Date(selectedDate);
    d.setMonth(d.getMonth() + 2);
    d.setDate(0);
    d.setHours(23, 59, 59, 999);
    return d.toISOString();
  }, [selectedDate]);

  const visitsQuery = useVisitsQuery(rangeFrom, rangeTo);
  const jobsQuery = useJobsQuery();

  // Prefer visits when the API is available; fall back to jobs if migration/API missing
  const usingVisits = visitsQuery.isSuccess;
  const visitsFailed = visitsQuery.isError;
  const jobs: Job[] = useMemo(() => {
    if (usingVisits) {
      return visitsToCalendarJobs(visitsQuery.data ?? []);
    }
    return (jobsQuery.data ?? []) as Job[];
  }, [usingVisits, visitsQuery.data, jobsQuery.data]);

  // While visits are loading (or succeeded), poll that query. On hard failure, jobs take over.
  const isLoading = visitsFailed ? jobsQuery.isLoading : visitsQuery.isLoading;
  const queryError = visitsFailed ? jobsQuery.error : null;
  const refetch = visitsFailed ? jobsQuery.refetch : visitsQuery.refetch;
  const hasQueryData = visitsFailed
    ? jobsQuery.data !== undefined
    : visitsQuery.data !== undefined;

  const availableTags = useMemo(() => {
    const allTags = new Set<string>();
    jobs.forEach((job) => {
      if (job.tags && Array.isArray(job.tags)) {
        job.tags.forEach((tag) => allTags.add(tag));
      }
    });
    return Array.from(allTags).sort();
  }, [jobs]);

  const error =
    queryError instanceof Error ? queryError.message : queryError ? "Failed to fetch jobs" : null;

  const handleJobCreated = async (_newJob: Job) => {
    await Promise.all([invalidate.jobs(), invalidate.visits()]);
  };

  const handleJobUpdated = async (_updatedJob: Job) => {
    await Promise.all([invalidate.jobs(), invalidate.visits()]);
    setSelectedJob(null);
  };

  const handleEditJob = (job: Job) => {
    // Visit-mapped calendar events keep visit id for rendering; edit the parent job
    setSelectedJob(
      job.job_id
        ? { ...job, id: job.job_id }
        : job
    );
    setShowEditJob(true);
  };

  const getJobsForDate = (date: Date) => {
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);
    
    return jobs.filter(job => {
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

  const getWeekDays = () => {
    const startOfWeek = new Date(selectedDate);
    startOfWeek.setDate(selectedDate.getDate() - selectedDate.getDay());

    const days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      return date;
    });
    return prefs.showWeekends ? days : days.filter((d) => d.getDay() !== 0 && d.getDay() !== 6);
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

  if (error && !hasQueryData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 mb-4">Error: {error}</p>
          <Button onClick={() => refetch()}>Try Again</Button>
        </div>
      </div>
    );
  }

  return (
    <>
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
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPrefsPanel(true)}
                  title="Schedule settings"
                  aria-label="Schedule settings"
                >
                  <Settings className="h-4 w-4" />
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
          {isLoading && !hasQueryData ? (
            <CalendarSkeleton />
          ) : (
          <>
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              {selectedDate.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </h2>
            {scheduleError && (
              <div className="flex items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
                <span>{scheduleError}</span>
                <button onClick={() => setScheduleError(null)} className="font-medium hover:underline shrink-0">
                  Dismiss
                </button>
              </div>
            )}
          </div>

          {/* Calendar View */}
          {view === 'week' && (() => {
            const weekDays = getWeekDays();
            const gridTemplateColumns = `repeat(${weekDays.length + 1}, minmax(0, 1fr))`;
            return (
            <DndContext sensors={dndSensors} onDragEnd={handleDragEnd}>
            <div className="bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden">
              {/* Week Header */}
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
                <div className="grid" style={{ gridTemplateColumns }}>
                  <div className="p-6 border-r border-blue-500/20">
                    <div className="text-sm font-medium opacity-90">Time</div>
                  </div>
                  {weekDays.map((day, index) => {
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
                const totalHeight = hoursCount * WEEK_HOUR_PX;

                return (
                  <div className="grid overflow-y-auto max-h-[calc(100vh-300px)]" style={{ minHeight: '600px', gridTemplateColumns }}>
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
                    {weekDays.map((day, dayIndex) => {
                      const isToday = day.toDateString() === new Date().toDateString();
                      const dayJobs = getJobsForDate(day);
                      const positionedJobs = calculateEventPositions(dayJobs) as (Job & PositionedEvent)[];
                      return (
                        <WeekDayColumn
                          key={dayIndex}
                          day={day}
                          isToday={isToday}
                          totalHeight={totalHeight}
                          positionedJobs={positionedJobs}
                          startHour={startHour}
                          prefs={prefs}
                          colorByUserId={colorByUserId}
                          usingVisits={usingVisits}
                          onEditJob={handleEditJob}
                          onResizeEnd={handleResizeEnd}
                        />
                      );
                    })}
                  </div>
                );
              })()}
            </div>
            </DndContext>
            );
          })()}

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
              {(() => {
                const monthDayLabels = prefs.showWeekends
                  ? ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
                  : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
                const allMonthDates = Array.from(
                  { length: 35 },
                  (_, i) => new Date(selectedDate.getFullYear(), selectedDate.getMonth(), i - 6),
                );
                const monthDates = prefs.showWeekends
                  ? allMonthDates
                  : allMonthDates.filter((d) => d.getDay() !== 0 && d.getDay() !== 6);
                const monthGridColsClass = prefs.showWeekends ? 'grid-cols-7' : 'grid-cols-5';

                return (
              <div className={`grid ${monthGridColsClass}`}>
                {/* Day Headers */}
                {monthDayLabels.map((day) => (
                  <div key={day} className="p-4 bg-gray-50 border-r border-b text-center font-semibold text-gray-700">
                    {day}
                  </div>
                ))}

                {/* Calendar Days */}
                {monthDates.map((date, i) => {
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
                      <div className="space-y-1">
                        {dayJobs.slice(0, 3).map((job) => {
                          const StatusIcon = getStatusIcon(job.status);
                          const completed = getCompletedClasses(job.status, prefs.completedStyle);
                          const color = getJobColor(firstAssigneeUserId(job.job_assignments), colorByUserId);
                          const appearance = getJobCardAppearance(color);
                          return (
                            <div
                              key={job.id}
                              className={`w-full p-2 ${appearance.cardClassName} rounded text-xs cursor-pointer hover:shadow-md transition-all group ${completed.card}`}
                              style={appearance.cardStyle}
                              onClick={() => handleEditJob(job)}
                            >
                              <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center space-x-1">
                                  <StatusIcon className={`h-2 w-2 ${appearance.accentClassName}`} />
                                  <span className={`font-medium ${color ? 'text-gray-900' : 'text-blue-900'}`}>
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
                                  <Edit className={`h-2.5 w-2.5 ${appearance.accentClassName}`} />
                                </button>
                              </div>
                              <div className="flex items-center space-x-1">
                                <div className={`text-gray-900 truncate font-medium flex-1 ${completed.title}`}>
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
                );
              })()}
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
              <DndContext sensors={dndSensors} onDragEnd={handleDragEnd}>
              <div className="p-6">
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

                  // Position every job once for the whole day, instead of the old
                  // per-hour "starting jobs only" loop - fixes multi-hour overlaps
                  // being invisible to the overlap math.
                  const positionedJobs = calculateEventPositions(dayJobs) as (Job & PositionedEvent)[];
                  const now = new Date();
                  const isCurrentDay = selectedDate.toDateString() === now.toDateString();
                  const formatHour = (hour: number) =>
                    hour === 0 ? '12 AM' : hour === 12 ? '12 PM' : hour > 12 ? `${hour - 12} PM` : `${hour} AM`;

                  if (prefs.dayOrientation === 'horizontal') {
                    const HOUR_WIDTH = 140;
                    const ROW_HEIGHT = 84;
                    const CASCADE_PX = 14;
                    const isStacked = prefs.appointmentLayout === 'stacked';
                    const totalWidth = hoursCount * HOUR_WIDTH;
                    const maxColumn = positionedJobs.reduce((m, j) => Math.max(m, j.column), 0);
                    const rowsHeight = isStacked
                      ? ROW_HEIGHT + maxColumn * CASCADE_PX
                      : (maxColumn + 1) * ROW_HEIGHT;
                    const nowOffsetPx = ((now.getHours() + now.getMinutes() / 60) - startHour) * HOUR_WIDTH;

                    return (
                      <div className="overflow-x-auto">
                        <div style={{ width: `${totalWidth}px` }}>
                          <div className="flex border-b border-gray-200">
                            {Array.from({ length: hoursCount }, (_, i) => {
                              const hour = startHour + i;
                              return (
                                <div
                                  key={hour}
                                  className="text-xs text-gray-500 font-medium border-l border-gray-100 pl-1 pb-1"
                                  style={{ width: `${HOUR_WIDTH}px` }}
                                >
                                  {formatHour(hour)}
                                </div>
                              );
                            })}
                          </div>
                          <div className="relative mt-2" style={{ height: `${rowsHeight}px` }}>
                            {isCurrentDay && nowOffsetPx >= 0 && nowOffsetPx <= totalWidth && (
                              <div
                                className="absolute top-0 bottom-0 w-0.5 bg-orange-500 z-10 pointer-events-none"
                                style={{ left: `${nowOffsetPx}px` }}
                              />
                            )}
                            {positionedJobs.length === 0 && (
                              <div className="text-sm text-gray-400 pt-2">No jobs scheduled for this day.</div>
                            )}
                            {positionedJobs.map((job) => {
                              const startDate = new Date(job.start_time);
                              const endDate = new Date(job.end_time);
                              const startFrac = Math.max(0, (startDate.getHours() + startDate.getMinutes() / 60) - startHour);
                              const endFrac = (endDate.getHours() + endDate.getMinutes() / 60) - startHour;
                              const left = startFrac * HOUR_WIDTH;
                              const width = Math.max(endFrac - startFrac, 0.5) * HOUR_WIDTH;
                              const top = isStacked ? job.column * CASCADE_PX : job.column * ROW_HEIGHT;
                              const height = ROW_HEIGHT - 8;
                              const StatusIcon = getStatusIcon(job.status);
                              const completed = getCompletedClasses(job.status, prefs.completedStyle);
                              const color = getJobColor(firstAssigneeUserId(job.job_assignments), colorByUserId);
                              const appearance = getJobCardAppearance(color);
                              const draggable = usingVisits && Boolean(job.visit_id);

                              return (
                                <DraggableJobCard
                                  key={job.id}
                                  dragId={job.id}
                                  dragDisabled={!draggable}
                                  dragData={{ job, pxPerHour: HOUR_WIDTH, axis: 'horizontal' }}
                                  className={`absolute p-2 ${appearance.cardClassName} rounded-lg cursor-pointer hover:shadow-lg transition-all group overflow-hidden ${completed.card}`}
                                  style={{
                                    left: `${left}px`,
                                    width: `${width}px`,
                                    top: `${top}px`,
                                    height: `${height}px`,
                                    zIndex: job.column + 1,
                                    ...appearance.cardStyle,
                                  }}
                                  onClick={() => handleEditJob(job)}
                                  resize={draggable ? { axis: 'horizontal', onCommit: (deltaPx) => handleResizeEnd(job, deltaPx, HOUR_WIDTH) } : undefined}
                                >
                                  <div className="flex items-center gap-1 mb-0.5">
                                    <StatusIcon className={`h-3 w-3 shrink-0 ${appearance.accentClassName}`} />
                                    <span className={`text-xs font-semibold truncate ${color ? 'text-gray-900' : 'text-blue-900'}`}>
                                      {formatTime(job.start_time)}
                                    </span>
                                  </div>
                                  <div className={`text-xs font-semibold text-gray-900 truncate ${completed.title}`}>
                                    {job.title}
                                  </div>
                                  <div className="text-xs text-gray-600 truncate">{job.client_name}</div>
                                </DraggableJobCard>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  }

                  // Vertical (default)
                  const HOUR_HEIGHT = 80;
                  const totalHeight = hoursCount * HOUR_HEIGHT;
                  const nowOffsetPx = ((now.getHours() + now.getMinutes() / 60) - startHour) * HOUR_HEIGHT;
                  const padding = 4;

                  return (
                    <div className="flex">
                      <div className="w-20 shrink-0">
                        {Array.from({ length: hoursCount }, (_, i) => {
                          const hour = startHour + i;
                          return (
                            <div
                              key={hour}
                              className="text-sm font-medium text-gray-500 pt-1"
                              style={{ height: `${HOUR_HEIGHT}px` }}
                            >
                              {hour === 12 ? '12:00 PM' : hour > 12 ? `${hour - 12}:00 PM` : `${hour}:00 AM`}
                            </div>
                          );
                        })}
                      </div>
                      <div className="flex-1 ml-4 relative border-l border-gray-100" style={{ height: `${totalHeight}px` }}>
                        {Array.from({ length: hoursCount }, (_, i) => (
                          <div
                            key={i}
                            className="absolute left-0 right-0 border-t border-gray-100"
                            style={{ top: `${i * HOUR_HEIGHT}px` }}
                          />
                        ))}
                        {isCurrentDay && nowOffsetPx >= 0 && nowOffsetPx <= totalHeight && (
                          <div
                            className="absolute left-0 right-0 z-10 flex items-center pointer-events-none"
                            style={{ top: `${nowOffsetPx}px` }}
                          >
                            <div className="w-2.5 h-2.5 bg-orange-500 rounded-full border-2 border-white shadow-md -ml-1"></div>
                            <div className="ml-2 text-xs font-semibold text-orange-600 bg-white px-1.5 py-0.5 rounded">
                              Now
                            </div>
                            <div className="flex-1 h-0.5 bg-orange-500 ml-2"></div>
                          </div>
                        )}
                        {positionedJobs.length === 0 && (
                          <div className="text-sm text-gray-400 pt-4 pl-2">No jobs scheduled for this day.</div>
                        )}
                        {positionedJobs.map((job) => {
                          const startDate = new Date(job.start_time);
                          const endDate = new Date(job.end_time);
                          const startFrac = Math.max(0, (startDate.getHours() + startDate.getMinutes() / 60) - startHour);
                          const endFrac = (endDate.getHours() + endDate.getMinutes() / 60) - startHour;
                          const top = startFrac * HOUR_HEIGHT;
                          const height = Math.max(endFrac - startFrac, 0.5) * HOUR_HEIGHT;
                          const StatusIcon = getStatusIcon(job.status);
                          const layoutStyle = getLayoutStyle(job, prefs.appointmentLayout);
                          const completed = getCompletedClasses(job.status, prefs.completedStyle);
                          const color = getJobColor(firstAssigneeUserId(job.job_assignments), colorByUserId);
                          const appearance = getJobCardAppearance(color);
                          const draggable = usingVisits && Boolean(job.visit_id);

                          return (
                            <DraggableJobCard
                              key={job.id}
                              dragId={job.id}
                              dragDisabled={!draggable}
                              dragData={{ job, pxPerHour: HOUR_HEIGHT, axis: 'vertical' }}
                              className={`absolute p-3 ${appearance.cardClassName} rounded-lg hover:shadow-lg transition-all duration-200 group overflow-hidden cursor-pointer ${completed.card}`}
                              style={{
                                top: `${top}px`,
                                height: `${height}px`,
                                left: `calc(${layoutStyle.left} + ${padding}px)`,
                                width: `calc(${layoutStyle.width} - ${padding * 2}px)`,
                                zIndex: layoutStyle.zIndex,
                                ...appearance.cardStyle,
                              }}
                              onClick={() => handleEditJob(job)}
                              resize={draggable ? { axis: 'vertical', onCommit: (deltaPx) => handleResizeEnd(job, deltaPx, HOUR_HEIGHT) } : undefined}
                            >
                              <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center space-x-2">
                                  <StatusIcon className={`h-4 w-4 ${appearance.accentClassName}`} />
                                  <span className={`text-sm font-semibold ${color ? 'text-gray-900' : 'text-blue-900'}`}>
                                    {formatTime(job.start_time)} - {formatTime(job.end_time)}
                                  </span>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleEditJob(job);
                                    }}
                                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-blue-200 rounded"
                                    title="Edit job"
                                  >
                                    <Edit className={`h-4 w-4 ${appearance.accentClassName}`} />
                                  </button>
                                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(job.status)}`}>
                                    {job.status}
                                  </span>
                                </div>
                              </div>
                              <div className={`text-lg font-semibold text-gray-900 mb-1 truncate ${completed.title}`}>
                                {job.title}
                              </div>
                              <div className="text-sm text-gray-600 mb-2 truncate">
                                {job.client_name}
                              </div>
                              {job.location && (
                                <div className="text-sm text-gray-500 flex items-center truncate">
                                  <MapPin className="h-4 w-4 mr-1 shrink-0" />
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
                            </DraggableJobCard>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
              </div>
              </DndContext>
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
                            <Link href={`/jobs/${job.job_id || job.id}`}>
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
          </>
          )}
        </main>

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

      {/* Schedule personal settings */}
      <CalendarPreferencesPanel
        open={showPrefsPanel}
        onOpenChange={setShowPrefsPanel}
        value={prefs}
        onSave={(next) => {
          setPrefs(next);
          saveCalendarPreferences(next);
          setShowPrefsPanel(false);
        }}
      />
    </>
  );
}
