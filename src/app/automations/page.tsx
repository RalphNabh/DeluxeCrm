"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
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
  Bell,
  ChevronDown,
  Plus,
  Mail,
  Clock,
  User,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  Play,
  Pause,
  Edit,
  Trash2,
  Send,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const sidebarItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
  { icon: Users, label: "Clients", href: "/clients" },
  { icon: FileText, label: "Estimates", href: "/estimates" },
  { icon: DollarSign, label: "Invoices", href: "/invoices" },
  { icon: Calendar, label: "Calendar", href: "/calendar" },
  { icon: CheckSquare, label: "Tasks", href: "/tasks" },
  { icon: BarChart3, label: "Reports", href: "/reports" },
  { icon: Users, label: "Team", href: "/team" },
  { icon: Zap, label: "Automations", href: "/automations", active: true },
  { icon: Gift, label: "Affiliates", href: "/affiliates" },
  { icon: Settings, label: "Settings", href: "/settings" },
];

type Automation = {
  id: string;
  name: string;
  description?: string;
  is_active: boolean;
  trigger_event: string;
  action_type: string;
  action_payload?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

const AUTOMATION_TEMPLATES = [
  {
    id: 'estimate_followup',
    name: 'Send Follow-up Email After Estimate',
    description: 'Automatically send a follow-up email 3 days after sending an estimate',
    trigger_event: 'estimate_sent',
    action_type: 'send_email',
    action_payload: {
      delay_days: 3,
      subject: 'Follow-up on Your Estimate',
      body: 'Hi {{client_name}},\n\nI wanted to follow up on the estimate I sent you. Do you have any questions or would you like to discuss the proposal?\n\nBest regards'
    }
  },
  {
    id: 'estimate_approved_thankyou',
    name: 'Send Thank You Email After Approval',
    description: 'Send a thank you email when a client approves an estimate',
    trigger_event: 'estimate_approved',
    action_type: 'send_email',
    action_payload: {
      subject: 'Thank You for Your Approval',
      body: 'Hi {{client_name}},\n\nThank you for approving the estimate! We\'re excited to get started on your project. Our team will reach out shortly to schedule the work.\n\nBest regards'
    }
  },
  {
    id: 'invoice_overdue_reminder',
    name: 'Send Invoice Overdue Reminder',
    description: 'Send a reminder email when an invoice is overdue by 7 days',
    trigger_event: 'invoice_overdue',
    action_type: 'send_email',
    action_payload: {
      days_overdue: 7,
      subject: 'Reminder: Invoice Payment Due',
      body: 'Hi {{client_name}},\n\nThis is a friendly reminder that your invoice {{invoice_number}} for {{amount}} is now overdue. Please arrange payment at your earliest convenience.\n\nBest regards'
    }
  },
  {
    id: 'new_client_welcome',
    name: 'Send Welcome Email to New Client',
    description: 'Send a welcome email when a new client is added',
    trigger_event: 'client_created',
    action_type: 'send_email',
    action_payload: {
      subject: 'Welcome to Our Services',
      body: 'Hi {{client_name}},\n\nWelcome! We\'re thrilled to have you as a client. We\'re committed to providing you with excellent service.\n\nBest regards'
    }
  },
  {
    id: 'job_completion_thankyou',
    name: 'Send Thank You After Job Completion',
    description: 'Send a thank you email when a job is marked as completed',
    trigger_event: 'job_completed',
    action_type: 'send_email',
    action_payload: {
      subject: 'Thank You for Your Business',
      body: 'Hi {{client_name}},\n\nThank you for choosing us! We hope you\'re satisfied with the completed work. If you have any questions or need follow-up service, please don\'t hesitate to reach out.\n\nBest regards'
    }
  },
  {
    id: 'lead_estimate_sent',
    name: 'Follow Up When Estimate Sent',
    description: 'Send a follow-up email when a lead moves to "Estimate Sent" stage',
    trigger_event: 'lead_estimate_sent',
    action_type: 'send_email',
    action_payload: {
      subject: 'Thank You for Your Interest',
      body: 'Hi {{client_name}},\n\nThank you for your interest! We\'ve sent you a detailed estimate. Please review it and let us know if you have any questions.\n\nBest regards'
    }
  },
  {
    id: 'lead_approved',
    name: 'Welcome When Lead Approved',
    description: 'Send a welcome email when a lead moves to "Approved" stage',
    trigger_event: 'lead_approved',
    action_type: 'send_email',
    action_payload: {
      subject: 'Welcome! Let\'s Get Started',
      body: 'Hi {{client_name}},\n\nGreat news! We\'re excited to work with you. Our team will be in touch shortly to schedule your project.\n\nBest regards'
    }
  },
  {
    id: 'lead_job_scheduled',
    name: 'Confirm When Job Scheduled',
    description: 'Send a confirmation email when a lead moves to "Job Scheduled" stage',
    trigger_event: 'lead_job_scheduled',
    action_type: 'send_email',
    action_payload: {
      subject: 'Your Job Has Been Scheduled',
      body: 'Hi {{client_name}},\n\nYour job has been scheduled! We\'ll see you soon. If you have any questions before we start, please don\'t hesitate to reach out.\n\nBest regards'
    }
  },
  {
    id: 'lead_completed',
    name: 'Thank You When Job Completed',
    description: 'Send a thank you email when a lead moves to "Completed" stage',
    trigger_event: 'lead_completed',
    action_type: 'send_email',
    action_payload: {
      subject: 'Thank You for Your Business!',
      body: 'Hi {{client_name}},\n\nThank you for choosing us! We hope you\'re satisfied with the completed work. If you have any questions or need follow-up service, please don\'t hesitate to reach out.\n\nBest regards'
    }
  }
];

export default function AutomationsPage() {
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNewAutomation, setShowNewAutomation] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [customName, setCustomName] = useState('');
  const [customSubject, setCustomSubject] = useState('');
  const [customBody, setCustomBody] = useState('');
  const [creating, setCreating] = useState(false);
  const [editingAutomation, setEditingAutomation] = useState<Automation | null>(null);
  const [editSubject, setEditSubject] = useState('');
  const [editBody, setEditBody] = useState('');
  const [updating, setUpdating] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    fetchAutomations();
  }, []);

  const fetchAutomations = async () => {
    try {
      const res = await fetch('/api/automations');
      if (!res.ok) throw new Error('Failed to fetch automations');
      const data = await res.json();
      setAutomations(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to fetch automations');
    } finally {
      setLoading(false);
    }
  };

  const toggleAutomation = async (id: string, current: boolean) => {
    try {
      await fetch(`/api/automations/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !current })
      });
      setAutomations(prev => prev.map(a => a.id === id ? { ...a, is_active: !current } : a));
    } catch {}
  };

  const createAutomation = async () => {
    if (!selectedTemplate) {
      setError('Please select an automation template');
      return;
    }

    const template = AUTOMATION_TEMPLATES.find(t => t.id === selectedTemplate);
    if (!template) return;

    setCreating(true);
    setError(null);

    try {
      // Use custom messages if provided, otherwise use template defaults
      const actionPayload = { ...template.action_payload };
      if (template.action_type === 'send_email') {
        actionPayload.subject = customSubject || template.action_payload?.subject || '';
        actionPayload.body = customBody || template.action_payload?.body || '';
      }

      const response = await fetch('/api/automations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: customName || template.name,
          description: template.description,
          trigger_event: template.trigger_event,
          action_type: template.action_type,
          action_payload: actionPayload,
          is_active: true
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create automation');
      }

      const newAutomation = await response.json();
      setAutomations(prev => [newAutomation, ...prev]);
      setShowNewAutomation(false);
      setSelectedTemplate('');
      setCustomName('');
      setCustomSubject('');
      setCustomBody('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create automation');
    } finally {
      setCreating(false);
    }
  };

  const openEditDialog = (automation: Automation) => {
    setEditingAutomation(automation);
    if (automation.action_payload?.subject) {
      setEditSubject(automation.action_payload.subject);
    }
    if (automation.action_payload?.body) {
      setEditBody(automation.action_payload.body);
    }
  };

  const closeEditDialog = () => {
    setEditingAutomation(null);
    setEditSubject('');
    setEditBody('');
    setError(null);
  };

  const updateAutomation = async () => {
    if (!editingAutomation) return;

    setUpdating(true);
    setError(null);

    try {
      // Preserve existing payload fields and update subject/body
      const updatedPayload = { 
        ...(editingAutomation.action_payload || {}),
        subject: editSubject,
        body: editBody
      };

      const response = await fetch(`/api/automations/${editingAutomation.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action_payload: updatedPayload
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update automation');
      }

      const updated = await response.json();
      setAutomations(prev => prev.map(a => a.id === updated.id ? updated : a));
      closeEditDialog();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update automation');
    } finally {
      setUpdating(false);
    }
  };

  const deleteAutomation = async (id: string) => {
    if (!confirm('Are you sure you want to delete this automation?')) return;

    try {
      const response = await fetch(`/api/automations/${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to delete automation');

      setAutomations(prev => prev.filter(a => a.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete automation');
    }
  };

  const testAutomation = async (id: string) => {
    try {
      const response = await fetch(`/api/automations/${id}/test`, {
        method: 'POST'
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMessage = data.error || 'Failed to test automation';
        const details = data.details ? ` Details: ${JSON.stringify(data.details)}` : '';
        throw new Error(errorMessage + details);
      }

      alert(data.message || 'Automation test completed! Check your email if this automation sends emails.');
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'Failed to test automation';
      console.error('Test automation error:', e);
      alert(`Error: ${errorMessage}`);
    }
  };

  const getTriggerLabel = (trigger: string) => {
    const labels: Record<string, string> = {
      'estimate_sent': 'When estimate is sent',
      'estimate_approved': 'When estimate is approved',
      'invoice_overdue': 'When invoice is overdue',
      'client_created': 'When new client is added',
      'job_completed': 'When job is completed'
    };
    return labels[trigger] || trigger;
  };

  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      'send_email': 'Send email'
    };
    return labels[action] || action;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading automations...</p>
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
              <h1 className="text-2xl font-bold text-gray-900">Automations</h1>
              <p className="text-gray-600 mt-1">Automate your workflow to save time and improve client experience</p>
            </div>
            
            <div className="flex items-center space-x-4">
              <Dialog open={showNewAutomation} onOpenChange={setShowNewAutomation}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    New Automation
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Create New Automation</DialogTitle>
                    <DialogDescription>
                      Choose from our automation templates to streamline your workflow.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    {error && (
                      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                        {error}
                      </div>
                    )}
                    
                    <div>
                      <Label htmlFor="template">Automation Template</Label>
                      <Select value={selectedTemplate} onValueChange={(value) => {
                        setSelectedTemplate(value);
                        const template = AUTOMATION_TEMPLATES.find(t => t.id === value);
                        if (template && template.action_type === 'send_email') {
                          setCustomSubject(template.action_payload?.subject || '');
                          setCustomBody(template.action_payload?.body || '');
                        } else {
                          setCustomSubject('');
                          setCustomBody('');
                        }
                      }}>
                        <SelectTrigger id="template" className="mt-2">
                          <SelectValue placeholder="Select an automation template" />
                        </SelectTrigger>
                        <SelectContent>
                          {AUTOMATION_TEMPLATES.map((template) => (
                            <SelectItem key={template.id} value={template.id}>
                              <div>
                                <div className="font-medium">{template.name}</div>
                                <div className="text-xs text-gray-500">{template.description}</div>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {selectedTemplate && (
                      <>
                        <div>
                          <Label htmlFor="name">Custom Name (Optional)</Label>
                          <Input 
                            id="name" 
                            placeholder="Leave blank to use template name"
                            value={customName}
                            onChange={(e) => setCustomName(e.target.value)}
                            className="mt-2"
                          />
                        </div>

                        {(() => {
                          const template = AUTOMATION_TEMPLATES.find(t => t.id === selectedTemplate);
                          if (!template || template.action_type !== 'send_email') return null;
                          
                          return (
                            <>
                              <div>
                                <Label htmlFor="subject">Email Subject</Label>
                                <Input 
                                  id="subject" 
                                  placeholder="Email subject"
                                  value={customSubject}
                                  onChange={(e) => setCustomSubject(e.target.value)}
                                  className="mt-2"
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                  Use double curly braces for variables: {'{{'}client_name{'}}'}, {'{{'}amount{'}}'}, etc.
                                </p>
                              </div>

                              <div>
                                <Label htmlFor="body">Email Body</Label>
                                <Textarea 
                                  id="body" 
                                  placeholder="Email body"
                                  value={customBody}
                                  onChange={(e) => setCustomBody(e.target.value)}
                                  className="mt-2 min-h-[150px]"
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                  Use double curly braces for variables. Each line will be a paragraph.
                                </p>
                              </div>

                              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <h4 className="font-medium text-blue-900 mb-2">Preview</h4>
                                <div className="space-y-2 text-sm text-blue-800">
                                  <div>
                                    <span className="font-medium">Trigger:</span> {getTriggerLabel(template.trigger_event)}
                                  </div>
                                  <div>
                                    <span className="font-medium">Action:</span> {getActionLabel(template.action_type)}
                                  </div>
                                  <div className="text-xs text-blue-600 mt-2">{template.description}</div>
                                </div>
                              </div>
                            </>
                          );
                        })()}
                      </>
                    )}

                    <div className="flex justify-end space-x-2 pt-4">
                      <Button variant="outline" onClick={() => {
                        setShowNewAutomation(false);
                        setSelectedTemplate('');
                        setCustomName('');
                        setCustomSubject('');
                        setCustomBody('');
                        setError(null);
                      }}>
                        Cancel
                      </Button>
                      <Button 
                        onClick={createAutomation}
                        disabled={!selectedTemplate || creating}
                      >
                        {creating ? 'Creating...' : 'Create Automation'}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
              
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

        {/* Automations Content */}
        <main className="flex-1 p-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card className="border-0 shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Zap className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Active Automations</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {automations.filter(a => a.is_active).length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Automations</p>
                    <p className="text-2xl font-bold text-gray-900">{automations.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Mail className="h-5 w-5 text-purple-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Email Automations</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {automations.filter(a => a.action_type === 'send_email').length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Automations List */}
          {automations.length === 0 ? (
            <Card className="border-0 shadow-lg">
              <CardContent className="p-12 text-center">
                <Zap className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Automations Yet</h3>
                <p className="text-gray-600 mb-6">Get started by creating your first automation to streamline your workflow.</p>
                <Button onClick={() => setShowNewAutomation(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Automation
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {automations.map((automation) => (
                <Card key={automation.id} className="border-0 shadow-lg hover:shadow-xl transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <div className="p-2 bg-blue-100 rounded-lg">
                            <Mail className="h-5 w-5 text-blue-600" />
                          </div>
                          <div className="flex-1">
                            <CardTitle className="text-lg">{automation.name}</CardTitle>
                            <div className="flex items-center space-x-2 mt-1">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                automation.is_active 
                                  ? "bg-green-100 text-green-800" 
                                  : "bg-gray-100 text-gray-800"
                              }`}>
                                {automation.is_active ? "Active" : "Inactive"}
                              </span>
                            </div>
                          </div>
                        </div>
                        {automation.description && (
                          <CardDescription className="mt-2">{automation.description}</CardDescription>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch 
                          checked={automation.is_active} 
                          onCheckedChange={() => toggleAutomation(automation.id, automation.is_active)} 
                        />
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <ChevronDown className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {automation.action_type === 'send_email' && (
                              <DropdownMenuItem onClick={() => openEditDialog(automation)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit Message
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => testAutomation(automation.id)}>
                              <Play className="h-4 w-4 mr-2" />
                              Test Run
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => deleteAutomation(automation.id)}
                              className="text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">Trigger:</span>
                        <span className="font-medium text-gray-900">
                          {getTriggerLabel(automation.trigger_event)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">Action:</span>
                        <span className="font-medium text-gray-900">
                          {getActionLabel(automation.action_type)}
                        </span>
                      </div>
                      {automation.action_type === 'send_email' && automation.action_payload?.subject && (
                        <div className="text-sm">
                          <span className="text-gray-500">Subject:</span>
                          <p className="font-medium text-gray-900 mt-1 truncate">
                            {automation.action_payload.subject}
                          </p>
                        </div>
                      )}
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">Created:</span>
                        <span className="font-medium text-gray-900">
                          {new Date(automation.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </main>
      </div>

      {/* Edit Automation Dialog */}
      <Dialog open={!!editingAutomation} onOpenChange={(open) => !open && closeEditDialog()}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Automation Message</DialogTitle>
            <DialogDescription>
              Customize the email subject and body for this automation.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}

            {editingAutomation && editingAutomation.action_type === 'send_email' && (
              <>
                <div>
                  <Label htmlFor="edit-subject">Email Subject</Label>
                  <Input 
                    id="edit-subject" 
                    value={editSubject}
                    onChange={(e) => setEditSubject(e.target.value)}
                    className="mt-2"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Use double curly braces for variables: {'{{'}client_name{'}}'}, {'{{'}amount{'}}'}, etc.
                  </p>
                </div>

                <div>
                  <Label htmlFor="edit-body">Email Body</Label>
                  <Textarea 
                    id="edit-body" 
                    value={editBody}
                    onChange={(e) => setEditBody(e.target.value)}
                    className="mt-2 min-h-[200px]"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Use double curly braces for variables. Each line will be a paragraph.
                  </p>
                </div>
              </>
            )}

            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={closeEditDialog}>
                Cancel
              </Button>
              <Button 
                onClick={updateAutomation}
                disabled={updating || !editSubject || !editBody}
              >
                {updating ? 'Updating...' : 'Update Automation'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
