"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  useDroppable,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
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
  Edit,
  Trash2,
  Settings2,
  Undo2,
  X,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import SignOutButton from "@/components/auth/sign-out";
import UserProfile from "@/components/layout/user-profile";
import PageSidebar from "@/components/layout/page-sidebar";
import PageHeader from "@/components/layout/page-header";
import { formatCurrencyWithSymbol } from "@/lib/utils/currency";
import { useTutorial } from "@/components/tutorial/tutorial-provider";
import { DashboardTour } from "@/components/tutorial/dashboard-tour";
import { HelpCircle } from "lucide-react";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { useNotifications } from "@/components/notifications/notification-provider";

type Lead = {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  value: number;
  status: string;
  tags?: string[];
  created_at: string;
  updated_at: string;
};

type PipelineStage = {
  id: string;
  name: string;
  position: number;
  color: string;
  created_at: string;
  updated_at: string;
};

const sidebarItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard", active: true },
  { icon: Users, label: "Clients", href: "/clients" },
  { icon: FileText, label: "Estimates", href: "/estimates" },
  { icon: DollarSign, label: "Invoices", href: "/invoices" },
  { icon: Calendar, label: "Calendar", href: "/calendar" },
  { icon: CheckSquare, label: "Tasks", href: "/tasks" },
  { icon: BarChart3, label: "Reports", href: "/reports" },
  { icon: Users, label: "Team", href: "/team" },
  { icon: Zap, label: "Automations", href: "/automations" },
  { icon: Gift, label: "Affiliates", href: "/affiliates" },
  { icon: Settings, label: "Settings", href: "/settings" },
];

// Draggable Lead Card Component
function DraggableLeadCard({
  lead,
  stages,
  onStatusChange,
}: {
  lead: Lead;
  stages: PipelineStage[];
  onStatusChange: (leadId: string, newStatus: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: lead.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const currentStageIndex = stages.findIndex(s => s.name === lead.status);
  const prev = currentStageIndex > 0 && currentStageIndex !== -1 ? stages[currentStageIndex - 1].name : null;
  const next = currentStageIndex < stages.length - 1 && currentStageIndex !== -1 ? stages[currentStageIndex + 1].name : null;
  
  // Calculate progress percentage
  const progress = stages.length > 0 && currentStageIndex !== -1 ? Math.round(((currentStageIndex + 1) / stages.length) * 100) : 0;

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className="p-4 hover:shadow-md transition-all duration-200 cursor-grab active:cursor-grabbing border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 group dark:bg-gray-800"
      {...attributes}
      {...listeners}
    >
      <div className="space-y-2">
        <div className="flex items-start justify-between">
          <div>
            <h4 className="font-medium text-gray-900 dark:text-white text-sm group-hover:text-blue-700 dark:group-hover:text-blue-400">
              {lead.name}
            </h4>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{lead.address}</p>
          </div>
          <div className="text-right">
            <div className="text-sm font-semibold text-blue-600 dark:text-blue-400">
              {formatCurrencyWithSymbol(lead.value)}
            </div>
            <div className="flex items-center gap-1 mt-2">
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                disabled={!prev}
                onClick={(e) => {
                  e.stopPropagation();
                  if (prev) onStatusChange(lead.id, prev);
                }}
                title="Move to previous stage"
              >
                ◀
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                disabled={!next}
                onClick={(e) => {
                  e.stopPropagation();
                  if (next) onStatusChange(lead.id, next);
                }}
                title="Move to next stage"
              >
                ▶
              </Button>
            </div>
          </div>
        </div>
        
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>{lead.phone}</span>
          <div className="w-2 h-2 bg-blue-400 dark:bg-blue-500 rounded-full"></div>
        </div>
        
        {/* Tags */}
        {lead.tags && lead.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {lead.tags.slice(0, 3).map((tag, idx) => (
              <span
                key={idx}
                className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300"
              >
                <Tag className="h-2.5 w-2.5 mr-1" />
                {tag}
              </span>
            ))}
            {lead.tags.length > 3 && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                +{lead.tags.length - 3}
              </span>
            )}
          </div>
        )}
        
        <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500 dark:text-gray-400">Progress</span>
            <span className="font-medium text-gray-700 dark:text-gray-300">
              {progress}%
            </span>
            </div>
          <div className="w-full h-1 bg-gray-200 dark:bg-gray-700 rounded-full mt-1">
            <div 
              className="h-1 bg-blue-500 dark:bg-blue-600 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>
      </div>
    </Card>
  );
}

// Droppable Stage Container Component
function DroppableStage({
  stage,
  leads,
  stages,
  onStatusChange,
  onEditStage,
  onDeleteStage,
}: {
  stage: PipelineStage;
  leads: Lead[];
  stages: PipelineStage[];
  onStatusChange: (leadId: string, newStatus: string) => void;
  onEditStage?: (stage: PipelineStage) => void;
  onDeleteStage?: (stageId: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ 
    id: stage.name,
  });

  const leadIds = leads.map(l => l.id);

  return (
    <div 
      ref={setNodeRef}
      className={`space-y-4 ${isOver ? 'bg-blue-50 dark:bg-blue-900/20 rounded-lg p-2 transition-colors' : ''}`}
    >
      <div className="text-center relative">
        <div className="flex items-center justify-center gap-2 mb-2">
          <h3 
            className="font-semibold text-gray-900 dark:text-white"
            style={{ color: stage.color }}
          >
            {stage.name}
          </h3>
          {(onEditStage || onDeleteStage) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                  <Settings2 className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {onEditStage && (
                  <DropdownMenuItem onClick={() => onEditStage(stage)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Rename
                  </DropdownMenuItem>
                )}
                {onDeleteStage && (
                  <DropdownMenuItem 
                    onClick={() => onDeleteStage(stage.id)}
                    className="text-red-600"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
        <div className="w-full h-1 bg-gray-200 dark:bg-gray-700 rounded-full">
          <div 
            className="h-1 rounded-full transition-all duration-300"
            style={{ 
              width: `${Math.min((leads.length / Math.max(1, leads.length)) * 100, 100)}%`,
              backgroundColor: stage.color
            }}
          ></div>
        </div>
      </div>
      
      <div className="space-y-3 min-h-[200px]">
        {leadIds.length > 0 ? (
          <SortableContext 
            items={leadIds.filter(id => id != null)} 
            strategy={verticalListSortingStrategy}
          >
            {leads.map((lead) => (
              <DraggableLeadCard
                key={lead.id}
                lead={lead}
                stages={stages}
                onStatusChange={onStatusChange}
              />
            ))}
          </SortableContext>
        ) : (
          <div className="text-center text-sm text-gray-400 py-8">
            No leads in this stage
          </div>
        )}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [searchQuery, setSearchQuery] = useState("");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showStageDialog, setShowStageDialog] = useState(false);
  const [editingStage, setEditingStage] = useState<PipelineStage | null>(null);
  const [newStageName, setNewStageName] = useState("");
  const [deletedStage, setDeletedStage] = useState<PipelineStage | null>(null);
  const [undoTimeout, setUndoTimeout] = useState<NodeJS.Timeout | null>(null);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const { startTutorial, isTutorialCompleted } = useTutorial();
  const { addNotification } = useNotifications();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require 8px of movement before drag starts - allows clicking buttons
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch pipeline stages first
        const stagesRes = await fetch("/api/pipeline-stages");
        if (!stagesRes.ok) throw new Error("Failed to load pipeline stages");
        const stagesData = await stagesRes.json();
        setStages(stagesData.sort((a: PipelineStage, b: PipelineStage) => a.position - b.position));

        // Then fetch leads
        const leadsRes = await fetch("/api/leads");
        if (!leadsRes.ok) throw new Error("Failed to load leads");
        const leadsData = await leadsRes.json();
        setLeads(leadsData);
        
        // Extract all unique tags from leads
        const allTags = new Set<string>();
        leadsData.forEach((lead: Lead) => {
          if (lead.tags && Array.isArray(lead.tags)) {
            lead.tags.forEach(tag => {
              if (tag && tag.trim() !== '') {
                allTags.add(tag);
              }
            });
          }
        });
        setAvailableTags(Array.from(allTags).sort());
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error loading data");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Show welcome notification after login/signup
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Use a delay to ensure notification provider is ready after navigation
      const timer = setTimeout(() => {
        // Check for sessionStorage flag (from login/signup)
        const showWelcome = sessionStorage.getItem('showWelcomeNotification');
        // Check for URL query parameter (from email verification callback)
        const urlParams = new URLSearchParams(window.location.search);
        const welcomeParam = urlParams.get('welcome');
        
        if (showWelcome === 'true' || welcomeParam === 'true') {
          // Clear the flag first (before adding notification in case of errors)
          sessionStorage.removeItem('showWelcomeNotification');
          
          // Remove query parameter from URL without reload
          if (welcomeParam === 'true') {
            urlParams.delete('welcome');
            const newUrl = window.location.pathname + (urlParams.toString() ? '?' + urlParams.toString() : '');
            window.history.replaceState({}, '', newUrl);
          }
          
          // Add welcome notification
          // Check if addNotification is a valid function (not the fallback)
          if (addNotification && typeof addNotification === 'function') {
            try {
              addNotification({
                type: 'success',
                title: 'Welcome to DyluxePro!',
                message: 'Your CRM is ready to use. Start by adding your first client.',
                actionUrl: '/clients/new',
                actionLabel: 'Add Client'
              });
            } catch (error) {
              console.error('Failed to add welcome notification:', error);
            }
          } else {
            console.warn('addNotification is not available');
          }
        }
      }, 300); // Delay to ensure provider and DOM are ready after navigation

      return () => clearTimeout(timer);
    }
  }, [addNotification]);

  const grouped = useMemo(() => {
    const map: Record<string, Lead[]> = {};
    // Initialize map with all stages
    stages.forEach(stage => {
      map[stage.name] = [];
    });
    
    let filtered = leads.filter((l) =>
      [l.name, l.address, l.email, l.phone]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(searchQuery.toLowerCase())
    );
    
    // Filter by tag if selected
    if (selectedTag) {
      filtered = filtered.filter(lead => 
        lead.tags && Array.isArray(lead.tags) && lead.tags.includes(selectedTag)
      );
    }
    
    for (const lead of filtered) {
      if (map[lead.status]) {
        map[lead.status].push(lead);
      } else {
        // If lead has a status that doesn't exist in stages, add it to a default group
        if (!map['Other']) map['Other'] = [];
        map['Other'].push(lead);
      }
    }
    return map;
  }, [leads, searchQuery, stages, selectedTag]);

  const maxColumnLen = useMemo(
    () => Math.max(1, ...stages.map((s) => grouped[s.name]?.length || 0)),
    [grouped, stages]
  );

  async function changeLeadStatus(leadId: string, newStatus: string) {
    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed to update lead");
      const updated = (await res.json()) as Lead;
      setLeads((prev) => prev.map((l) => (l.id === leadId ? updated : l)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update lead");
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (!over || !active) {
      setActiveId(null);
      return;
    }

    const leadId = String(active.id);
    const newStage = String(over.id);

    // Validate that the new stage is a valid stage
    if (!stages.some(s => s.name === newStage)) {
      setActiveId(null);
      return;
    }

    // Find the lead being dragged
    const lead = leads.find((l) => l.id === leadId);
    if (!lead || lead.status === newStage) {
      setActiveId(null);
      return;
    }

    // Update the lead status
    changeLeadStatus(leadId, newStage);
    setActiveId(null);
  }

  const handleCreateStage = async () => {
    if (!newStageName.trim()) return;
    
    try {
      const res = await fetch("/api/pipeline-stages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newStageName.trim() }),
      });
      
      if (!res.ok) throw new Error("Failed to create stage");
      const newStage = await res.json();
      setStages(prev => [...prev, newStage].sort((a, b) => a.position - b.position));
      setNewStageName("");
      setShowStageDialog(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create stage");
    }
  };

  const handleEditStage = async (stage: PipelineStage) => {
    setEditingStage(stage);
    setNewStageName(stage.name);
    setShowStageDialog(true);
  };

  const handleUpdateStage = async () => {
    if (!editingStage || !newStageName.trim()) return;
    
    try {
      const res = await fetch(`/api/pipeline-stages/${editingStage.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newStageName.trim() }),
      });
      
      if (!res.ok) throw new Error("Failed to update stage");
      const updatedStage = await res.json();
      setStages(prev => prev.map(s => s.id === updatedStage.id ? updatedStage : s).sort((a, b) => a.position - b.position));
      
      // Update all leads with the old stage name to the new name
      setLeads(prev => prev.map(lead => 
        lead.status === editingStage.name ? { ...lead, status: updatedStage.name } : lead
      ));
      
      setNewStageName("");
      setEditingStage(null);
      setShowStageDialog(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update stage");
    }
  };

  const handleDeleteStage = async (stageId: string) => {
    const stageToDelete = stages.find(s => s.id === stageId);
    if (!stageToDelete) return;

    // Check if any leads are using this stage
    const leadsInStage = leads.filter(l => l.status === stageToDelete.name);
    if (leadsInStage.length > 0) {
      alert(`Cannot delete stage. There are ${leadsInStage.length} lead(s) using this stage. Please move them first.`);
      return;
    }

    // Store the deleted stage for undo
    setDeletedStage(stageToDelete);
    
    // Optimistically remove from UI
    setStages(prev => prev.filter(s => s.id !== stageId));
    
    // Set timeout to actually delete after 5 seconds if not undone
    const timeout = setTimeout(async () => {
      try {
        const res = await fetch(`/api/pipeline-stages/${stageId}`, {
          method: "DELETE",
        });
        
        if (!res.ok) {
          // If deletion fails, restore the stage
          setStages(prev => [...prev, stageToDelete].sort((a, b) => a.position - b.position));
          const error = await res.json();
          throw new Error(error.error || "Failed to delete stage");
        }
      } catch (e) {
        console.error("Error deleting stage:", e);
        // Restore stage if deletion fails
        setStages(prev => [...prev, stageToDelete].sort((a, b) => a.position - b.position));
        alert(e instanceof Error ? e.message : "Failed to delete stage");
      } finally {
        setDeletedStage(null);
      }
    }, 5000); // 5 seconds to undo
    
    setUndoTimeout(timeout);
  };

  const handleUndoDelete = () => {
    if (!deletedStage) return;
    
    // Clear the timeout
    if (undoTimeout) {
      clearTimeout(undoTimeout);
      setUndoTimeout(null);
    }
    
    // Restore the stage
    setStages(prev => [...prev, deletedStage].sort((a, b) => a.position - b.position));
    setDeletedStage(null);
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (undoTimeout) {
        clearTimeout(undoTimeout);
      }
    };
  }, [undoTimeout]);

  function handleDragStart(event: DragEndEvent | { active?: { id?: string | number } }) {
    if (event?.active?.id) {
      setActiveId(String(event.active.id));
    }
  }


  return (
    <>
      <DashboardTour />
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex transition-colors h-screen">
        {/* Sidebar */}
        <div data-tutorial="navigation" className="flex-shrink-0">
          <PageSidebar items={sidebarItems.map(item => ({
            ...item,
            active: item.active || false
          }))} />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Bar */}
        <PageHeader
          title="Sales Pipeline"
          description="Track and manage your projects from lead to completion."
          searchPlaceholder="Search clients, estimates..."
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          showSearch={true}
          primaryAction={
            <Link href="/clients/new">
              <Button variant="outline" size="sm" data-tutorial="add-client">
                <Plus className="h-4 w-4 mr-2" />
                New Client
              </Button>
            </Link>
          }
          secondaryActions={
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={startTutorial}
                title="Take Tutorial"
              >
                <HelpCircle className="h-4 w-4" />
              </Button>
            </>
          }
          filters={
            <>
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
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Filter
              </Button>
            </>
          }
        />

        {/* Dashboard Content */}
        <main className="flex-1 p-6">
          {/* Undo Notification */}
          {deletedStage && (
            <div className="mb-4 fixed top-20 left-1/2 transform -translate-x-1/2 z-50 animate-in slide-in-from-top-5">
              <Card className="border-2 border-blue-500 shadow-lg bg-white dark:bg-gray-800">
                <CardContent className="p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                      <Trash2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        Stage "{deletedStage.name}" deleted
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        You have 5 seconds to undo
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={handleUndoDelete}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <Undo2 className="h-4 w-4 mr-2" />
                      Undo
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (undoTimeout) clearTimeout(undoTimeout);
                        setDeletedStage(null);
                        setUndoTimeout(null);
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
          </div>
          )}

          {/* Pipeline Stats */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Pipeline Overview</h2>
            <Dialog open={showStageDialog} onOpenChange={setShowStageDialog}>
              <DialogTrigger asChild>
                <Button size="sm" onClick={() => { setEditingStage(null); setNewStageName(""); }}>
                  <Plus className="h-4 w-4 mr-2" />
                  New Stage
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingStage ? 'Rename Stage' : 'Create New Stage'}</DialogTitle>
                  <DialogDescription>
                    {editingStage ? 'Update the name of this pipeline stage' : 'Add a new stage to your sales pipeline'}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <Label htmlFor="stage-name">Stage Name</Label>
                    <Input
                      id="stage-name"
                      value={newStageName}
                      onChange={(e) => setNewStageName(e.target.value)}
                      placeholder="e.g., Qualified, Proposal Sent"
                      className="mt-1"
                    />
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => { setShowStageDialog(false); setEditingStage(null); setNewStageName(""); }}>
                      Cancel
                    </Button>
                    <Button onClick={editingStage ? handleUpdateStage : handleCreateStage}>
                      {editingStage ? 'Update' : 'Create'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <div className={`grid gap-6 mb-8`} style={{ gridTemplateColumns: `repeat(${stages.length}, minmax(0, 1fr))` }}>
            {stages.map((stage) => (
              <Card key={stage.id} className="border-0 shadow-sm dark:bg-gray-800 dark:border-gray-700">
                <CardContent className="p-4">
                  <div className="text-center">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-1" style={{ color: stage.color }}>{stage.name}</h3>
                    <div className="text-2xl font-bold mb-1" style={{ color: stage.color }}>{grouped[stage.name]?.length || 0}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {formatCurrencyWithSymbol((grouped[stage.name] || [])
                        .reduce((sum, lead) => sum + (lead.value ?? 0), 0))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Sales Pipeline Board with Drag and Drop */}
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className={`grid gap-6`} style={{ gridTemplateColumns: `repeat(${stages.length}, minmax(0, 1fr))` }} data-tutorial="pipeline">
              {stages.map((stage) => (
                <DroppableStage
                  key={stage.id}
                  stage={stage}
                  stages={stages}
                  leads={grouped[stage.name] || []}
                  onStatusChange={changeLeadStatus}
                  onEditStage={handleEditStage}
                  onDeleteStage={handleDeleteStage}
                />
              ))}
            </div>
            <DragOverlay>
              {activeId ? (
                <Card className="p-4 border-2 border-blue-500 shadow-lg bg-white dark:bg-gray-800 opacity-90">
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    {leads.find(l => l.id === activeId)?.name}
                      </div>
                    </Card>
              ) : null}
            </DragOverlay>
          </DndContext>
          {loading && (
            <div className="text-center text-sm text-gray-500 dark:text-gray-400 mt-6">Loading leads...</div>
          )}
          {error && (
            <div className="text-center text-sm text-red-600 dark:text-red-400 mt-6">{error}</div>
          )}
        </main>
      </div>
    </div>
    </>
  );
}
