"use client";

import { useState } from "react";
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
import { useAutomationsQuery, useInvalidateQueries } from "@/lib/query/hooks";
import { ListPageSkeleton } from "@/components/ui/page-skeletons";

/** Official Google Ads icon mark (Google/Wikimedia brand SVG, wordmark cropped off), inlined so it works offline/self-hosted. */
function GoogleAdsIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 250.8 226" className={className} role="img" aria-label="Google Ads">
      <path fill="#3C8BD9" d="M85.9,28.6c2.4-6.3,5.7-12.1,10.6-16.8c19.6-19.1,52-14.3,65.3,9.7c10,18.2,20.6,36,30.9,54
		c17.2,29.9,34.6,59.8,51.6,89.8c14.3,25.1-1.2,56.8-29.6,61.1c-17.4,2.6-33.7-5.4-42.7-21c-15.1-26.3-30.3-52.6-45.4-78.8
		c-0.3-0.6-0.7-1.1-1.1-1.6c-1.6-1.3-2.3-3.2-3.3-4.9c-6.7-11.8-13.6-23.5-20.3-35.2c-4.3-7.6-8.8-15.1-13.1-22.7
		c-3.9-6.8-5.7-14.2-5.5-22C83.6,36.2,84.1,32.2,85.9,28.6" />
      <path fill="#FABC04" d="M85.9,28.6c-0.9,3.6-1.7,7.2-1.9,11c-0.3,8.4,1.8,16.2,6,23.5C101,82,112,101,122.9,120c1,1.7,1.8,3.4,2.8,5
		c-6,10.4-12,20.7-18.1,31.1c-8.4,14.5-16.8,29.1-25.3,43.6c-0.4,0-0.5-0.2-0.6-0.5c-0.1-0.8,0.2-1.5,0.4-2.3
		c4.1-15,0.7-28.3-9.6-39.7c-6.3-6.9-14.3-10.8-23.5-12.1c-12-1.7-22.6,1.4-32.1,8.9c-1.7,1.3-2.8,3.2-4.8,4.2
		c-0.4,0-0.6-0.2-0.7-0.5c4.8-8.3,9.5-16.6,14.3-24.9C45.5,98.4,65.3,64,85.2,29.7C85.4,29.3,85.7,29,85.9,28.6" />
      <path fill="#34A852" d="M11.8,158c1.9-1.7,3.7-3.5,5.7-5.1c24.3-19.2,60.8-5.3,66.1,25.1c1.3,7.3,0.6,14.3-1.6,21.3
		c-0.1,0.6-0.2,1.1-0.4,1.7c-0.9,1.6-1.7,3.3-2.7,4.9c-8.9,14.7-22,22-39.2,20.9C20,225.4,4.5,210.6,1.8,191
		c-1.3-9.5,0.6-18.4,5.5-26.6c1-1.8,2.2-3.4,3.3-5.2C11.1,158.8,10.9,158,11.8,158" />
      <path fill="#FABC04" d="M11.8,158c-0.4,0.4-0.4,1.1-1.1,1.2c-0.1-0.7,0.3-1.1,0.7-1.6L11.8,158" />
      <path fill="#E1C025" d="M81.6,201c-0.4-0.7,0-1.2,0.4-1.7c0.1,0.1,0.3,0.3,0.4,0.4L81.6,201" />
    </svg>
  );
}

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
    id: 'new_request_autoreply',
    name: 'Auto-Reply to New Requests',
    description: 'Automatically acknowledge a new service request as soon as it comes in',
    trigger_event: 'service_request_received',
    action_type: 'send_email',
    action_payload: {
      subject: 'We\'ve received your request',
      body: 'Hi {{client_name}},\n\nThanks for reaching out! We\'ve received your request "{{title}}" and will be in touch shortly.\n\nBest regards'
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
  const [actionError, setActionError] = useState<string | null>(null);
  const invalidate = useInvalidateQueries();

  const {
    data,
    isLoading,
    error: queryError,
    refetch,
  } = useAutomationsQuery();

  const automations = (data ?? []) as Automation[];

  const error =
    actionError ||
    (queryError instanceof Error ? queryError.message : queryError ? "Failed to fetch automations" : null);

  const toggleAutomation = async (id: string, current: boolean) => {
    try {
      await fetch(`/api/automations/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !current })
      });
      await invalidate.automations();
    } catch {}
  };

  const startFromTemplate = (templateId: string) => {
    const template = AUTOMATION_TEMPLATES.find(t => t.id === templateId);
    if (!template) return;
    setSelectedTemplate(templateId);
    setCustomName('');
    if (template.action_type === 'send_email') {
      setCustomSubject(template.action_payload?.subject || '');
      setCustomBody(template.action_payload?.body || '');
    } else {
      setCustomSubject('');
      setCustomBody('');
    }
    setActionError(null);
    setShowNewAutomation(true);
  };

  const getTemplateIcon = (templateId: string) => {
    const icons: Record<string, typeof Mail> = {
      estimate_followup: Clock,
      estimate_approved_thankyou: CheckCircle,
      invoice_overdue_reminder: AlertCircle,
      new_client_welcome: Gift,
      new_request_autoreply: Send,
      job_completion_thankyou: CheckSquare,
      lead_estimate_sent: Mail,
      lead_approved: User,
      lead_job_scheduled: Calendar,
      lead_completed: CheckCircle,
    };
    return icons[templateId] || Zap;
  };

  const createAutomation = async () => {
    if (!selectedTemplate) {
      setActionError('Please select an automation template');
      return;
    }

    const template = AUTOMATION_TEMPLATES.find(t => t.id === selectedTemplate);
    if (!template) return;

    setCreating(true);
    setActionError(null);

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

      await invalidate.automations();
      setShowNewAutomation(false);
      setSelectedTemplate('');
      setCustomName('');
      setCustomSubject('');
      setCustomBody('');
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Failed to create automation');
    } finally {
      setCreating(false);
    }
  };

  const openEditDialog = (automation: Automation) => {
    setEditingAutomation(automation);
    if (typeof automation.action_payload?.subject === 'string') {
      setEditSubject(automation.action_payload.subject);
    }
    if (typeof automation.action_payload?.body === 'string') {
      setEditBody(automation.action_payload.body);
    }
  };

  const closeEditDialog = () => {
    setEditingAutomation(null);
    setEditSubject('');
    setEditBody('');
    setActionError(null);
  };

  const updateAutomation = async () => {
    if (!editingAutomation) return;

    setUpdating(true);
    setActionError(null);

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

      await invalidate.automations();
      closeEditDialog();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Failed to update automation');
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

      await invalidate.automations();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Failed to delete automation');
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
      'job_completed': 'When job is completed',
      'visit_completed': 'When visit is completed',
      'service_request_received': 'When a new request comes in',
    };
    return labels[trigger] || trigger;
  };

  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      'send_email': 'Send email'
    };
    return labels[action] || action;
  };

  return (
    <>
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
                        setActionError(null);
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
          {isLoading && !data ? (
            <ListPageSkeleton cards={3} />
          ) : (
          <>
          {/* Connect Lead Sources */}
          <Card className="border-0 shadow-sm mb-8 bg-gradient-to-r from-blue-50 to-white">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-blue-100 rounded-lg shrink-0">
                    <GoogleAdsIcon className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">
                      Google Ads leads &rarr; Requests, automatically
                    </h2>
                    <p className="text-sm text-gray-600 mt-1 max-w-xl">
                      Connect Zapier once and every new lead from Google Ads (or 6,000+ other apps)
                      lands in your Requests inbox - no copying URLs or tokens.
                    </p>
                    <ol className="text-xs text-gray-500 mt-2 space-y-0.5 list-decimal list-inside">
                      <li>Click Connect with Zapier</li>
                      <li>Sign in to DyluxePro when Zapier asks</li>
                      <li>Pick Google Ads (or your source) and turn the Zap on</li>
                    </ol>
                  </div>
                </div>
                <div className="flex flex-col items-start md:items-end gap-2 shrink-0">
                  <a
                    href="https://zapier.com/developer/public-invite/245396/ce25dca52ebf2ac52725f8b3669948fa/"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button>
                      Connect with Zapier
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </a>
                  <Link href="/requests" className="text-xs text-blue-700 hover:underline">
                    Send a test lead, then check Requests
                  </Link>
                  <Link href="/contact" className="text-xs text-gray-500 hover:underline">
                    Need help connecting? We'll set it up for you
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Popular Automations */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-lg font-semibold text-gray-900">Popular Automations</h2>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              One-click starting points - pick one, customize the message, and turn it on.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {AUTOMATION_TEMPLATES.map((template) => {
                const TemplateIcon = getTemplateIcon(template.id);
                const inUse = automations.some(a => a.trigger_event === template.trigger_event);
                return (
                  <Card key={template.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-5">
                      <div className="flex items-start gap-3 mb-3">
                        <div className="p-2 bg-blue-100 rounded-lg shrink-0">
                          <TemplateIcon className="h-5 w-5 text-blue-600" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-medium text-gray-900 leading-tight">{template.name}</h3>
                          <p className="text-xs text-gray-500 mt-1">{getTriggerLabel(template.trigger_event)}</p>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 mb-4">{template.description}</p>
                      <div className="flex items-center justify-between">
                        <Button size="sm" variant="outline" onClick={() => startFromTemplate(template.id)}>
                          Use Template
                        </Button>
                        {inUse && (
                          <span className="text-xs text-green-700 font-medium">✓ Added</span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

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
                <p className="text-gray-600 mb-6">Pick one of the popular automations above, or build your own from scratch.</p>
                <Button onClick={() => setShowNewAutomation(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Custom Automation
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
                      {automation.action_type === 'send_email' &&
                        typeof automation.action_payload?.subject === 'string' && (
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
          </>
          )}
        </main>

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
    </>
  );
}
