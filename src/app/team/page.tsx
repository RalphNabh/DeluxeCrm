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
  Mail,
  Phone,
  Clock,
  CheckCircle,
  AlertTriangle,
  Edit,
  Trash2,
  Shield,
  UserPlus,
  Crown,
  UserCheck,
  UserX,
  X,
  Save,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const sidebarItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
  { icon: Users, label: "Clients", href: "/clients" },
  { icon: FileText, label: "Estimates", href: "/estimates" },
  { icon: DollarSign, label: "Invoices", href: "/invoices" },
  { icon: Calendar, label: "Calendar", href: "/calendar" },
  { icon: CheckSquare, label: "Tasks", href: "/tasks" },
  { icon: BarChart3, label: "Reports", href: "/reports" },
  { icon: Users, label: "Team", href: "/team", active: true },
  { icon: Zap, label: "Automations", href: "/automations" },
  { icon: Gift, label: "Affiliates", href: "/affiliates" },
  { icon: Settings, label: "Settings", href: "/settings" },
];

interface TeamMember {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: 'Owner' | 'Manager' | 'Worker' | 'Admin';
  status: 'Active' | 'Inactive' | 'Pending';
  joined_at: string;
  last_active?: string | null;
  jobs_completed: number;
  total_hours: number;
  avatar?: string;
  notes?: string;
}

export default function TeamPage() {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddMember, setShowAddMember] = useState(false);
  const [showEditMember, setShowEditMember] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'Worker' as 'Owner' | 'Manager' | 'Worker' | 'Admin',
    status: 'Pending' as 'Active' | 'Inactive' | 'Pending',
    notes: ''
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchTeamMembers();
  }, []);

  const fetchTeamMembers = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/team');
      if (!response.ok) {
        throw new Error('Failed to fetch team members');
      }
      const data = await response.json();
      setTeamMembers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch team members');
    } finally {
      setLoading(false);
    }
  };

  const handleAddMember = async () => {
    if (!formData.name || !formData.email) {
      setMessage('Name and email are required');
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch('/api/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add team member');
      }

      const newMember = await response.json();
      setTeamMembers([newMember, ...teamMembers]);
      setShowAddMember(false);
      resetForm();
      setMessage('Team member added successfully!');
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to add team member');
    } finally {
      setSaving(false);
    }
  };

  const handleEditMember = (member: TeamMember) => {
    setEditingMember(member);
    setFormData({
      name: member.name,
      email: member.email,
      phone: member.phone || '',
      role: member.role,
      status: member.status,
      notes: member.notes || ''
    });
    setShowEditMember(true);
  };

  const handleUpdateMember = async () => {
    if (!editingMember || !formData.name || !formData.email) {
      setMessage('Name and email are required');
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/team/${editingMember.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update team member');
      }

      const updatedMember = await response.json();
      setTeamMembers(teamMembers.map(m => m.id === updatedMember.id ? updatedMember : m));
      setShowEditMember(false);
      setEditingMember(null);
      resetForm();
      setMessage('Team member updated successfully!');
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to update team member');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteMember = async (id: string) => {
    if (!confirm('Are you sure you want to remove this team member?')) {
      return;
    }

    try {
      const response = await fetch(`/api/team/${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to delete team member');
      }

      setTeamMembers(teamMembers.filter(m => m.id !== id));
      setMessage('Team member removed successfully!');
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to delete team member');
    }
  };

  const handleEmail = (email: string) => {
    window.location.href = `mailto:${email}`;
  };

  const handlePhone = (phone?: string) => {
    if (phone) {
      window.location.href = `tel:${phone}`;
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      role: 'Worker',
      status: 'Pending',
      notes: ''
    });
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'Owner': return Crown;
      case 'Manager': return Shield;
      case 'Worker': return User;
      case 'Admin': return UserCheck;
      default: return User;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'Owner': return 'bg-purple-100 text-purple-800';
      case 'Manager': return 'bg-blue-100 text-blue-800';
      case 'Worker': return 'bg-green-100 text-green-800';
      case 'Admin': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return 'bg-green-100 text-green-800';
      case 'Inactive': return 'bg-gray-100 text-gray-800';
      case 'Pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Active': return CheckCircle;
      case 'Inactive': return UserX;
      case 'Pending': return Clock;
      default: return Clock;
    }
  };

  const filteredMembers = teamMembers.filter(member =>
    member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (member.phone && member.phone.includes(searchQuery))
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading team members...</p>
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
              <h1 className="text-2xl font-bold text-gray-900">Team Management</h1>
              <p className="text-gray-600 mt-1">Manage your team members and their roles.</p>
            </div>
            
            <div className="flex items-center space-x-4">
              <Dialog open={showAddMember} onOpenChange={(open) => {
                setShowAddMember(open);
                if (!open) resetForm();
              }}>
                <DialogTrigger asChild>
                  <Button onClick={() => resetForm()}>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add Member
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Add Team Member</DialogTitle>
                    <DialogDescription>
                      Add a new team member to your organization.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    {message && (
                      <div className={`p-3 rounded-md text-sm ${
                        message.includes('success') 
                          ? 'bg-green-50 text-green-700 border border-green-200' 
                          : 'bg-red-50 text-red-700 border border-red-200'
                      }`}>
                        {message}
                      </div>
                    )}
                    <div>
                      <Label htmlFor="add-name">Name *</Label>
                      <Input 
                        id="add-name" 
                        placeholder="Full name"
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        className="mt-2"
                      />
                    </div>
                    <div>
                      <Label htmlFor="add-email">Email *</Label>
                      <Input 
                        id="add-email" 
                        type="email" 
                        placeholder="email@example.com"
                        value={formData.email}
                        onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                        className="mt-2"
                      />
                    </div>
                    <div>
                      <Label htmlFor="add-phone">Phone</Label>
                      <Input 
                        id="add-phone" 
                        type="tel" 
                        placeholder="(555) 123-4567"
                        value={formData.phone}
                        onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                        className="mt-2"
                      />
                    </div>
                    <div>
                      <Label htmlFor="add-role">Role</Label>
                      <Select 
                        value={formData.role} 
                        onValueChange={(value: any) => setFormData(prev => ({ ...prev, role: value }))}
                      >
                        <SelectTrigger id="add-role" className="mt-2">
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Worker">Worker</SelectItem>
                          <SelectItem value="Manager">Manager</SelectItem>
                          <SelectItem value="Admin">Admin</SelectItem>
                          <SelectItem value="Owner">Owner</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="add-status">Status</Label>
                      <Select 
                        value={formData.status} 
                        onValueChange={(value: any) => setFormData(prev => ({ ...prev, status: value }))}
                      >
                        <SelectTrigger id="add-status" className="mt-2">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Pending">Pending</SelectItem>
                          <SelectItem value="Active">Active</SelectItem>
                          <SelectItem value="Inactive">Inactive</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="add-notes">Notes</Label>
                      <Textarea 
                        id="add-notes" 
                        placeholder="Optional notes about this team member..."
                        value={formData.notes}
                        onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                        className="mt-2"
                        rows={3}
                      />
                    </div>
                    <div className="flex justify-end space-x-2 pt-4">
                      <Button 
                        variant="outline" 
                        onClick={() => {
                          setShowAddMember(false);
                          resetForm();
                          setMessage(null);
                        }}
                      >
                        Cancel
                      </Button>
                      <Button onClick={handleAddMember} disabled={saving}>
                        {saving ? 'Adding...' : 'Add Team Member'}
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

        {/* Main Content */}
        <main className="flex-1 p-6">
          {message && !showAddMember && !showEditMember && (
            <div className={`mb-4 p-4 rounded-md border ${
              message.includes('success') 
                ? 'bg-green-50 text-green-700 border-green-200' 
                : 'bg-red-50 text-red-700 border-red-200'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  {message.includes('success') && <CheckCircle className="h-5 w-5 mr-2" />}
                  {message.includes('Error') && <AlertTriangle className="h-5 w-5 mr-2" />}
                  {message}
                </div>
                <Button variant="ghost" size="sm" onClick={() => setMessage(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Team Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card className="border-0 shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <Users className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Members</p>
                    <p className="text-2xl font-bold text-gray-900">{teamMembers.length}</p>
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
                    <p className="text-sm font-medium text-gray-600">Active</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {teamMembers.filter(m => m.status === 'Active').length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-3 bg-yellow-100 rounded-lg">
                    <Clock className="h-6 w-6 text-yellow-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Pending</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {teamMembers.filter(m => m.status === 'Pending').length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-3 bg-purple-100 rounded-lg">
                    <Crown className="h-6 w-6 text-purple-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Managers</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {teamMembers.filter(m => m.role === 'Manager' || m.role === 'Owner').length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Search */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search team members..."
                  className="pl-10 w-64"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Team Members List */}
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredMembers.map((member) => {
              const RoleIcon = getRoleIcon(member.role);
              const StatusIcon = getStatusIcon(member.status);
              
              return (
                <Card key={member.id} className="border-0 shadow-lg hover:shadow-xl transition-all duration-300">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={member.avatar} />
                          <AvatarFallback>
                            {member.name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="font-semibold text-gray-900">{member.name}</h3>
                          <p className="text-sm text-gray-600">{member.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <StatusIcon className="h-4 w-4 text-gray-400" />
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(member.status)}`}>
                          {member.status}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-3 mb-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Role</span>
                        <div className="flex items-center space-x-2">
                          <RoleIcon className="h-4 w-4 text-gray-400" />
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(member.role)}`}>
                            {member.role}
                          </span>
                        </div>
                      </div>

                      {member.phone && (
                        <div className="flex items-center text-sm text-gray-600">
                          <Phone className="h-4 w-4 mr-2" />
                          <span>{member.phone}</span>
                        </div>
                      )}

                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Jobs Completed</span>
                        <span className="font-semibold text-gray-900">{member.jobs_completed || 0}</span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Total Hours</span>
                        <span className="font-semibold text-gray-900">{member.total_hours || 0}h</span>
                      </div>

                      {member.last_active && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Last Active</span>
                          <span className="text-sm text-gray-500">
                            {new Date(member.last_active).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                      <div className="flex space-x-2">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleEmail(member.email)}
                          title="Send email"
                        >
                          <Mail className="h-4 w-4" />
                        </Button>
                        {member.phone && (
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handlePhone(member.phone)}
                            title="Call"
                          >
                            <Phone className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      <div className="flex space-x-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleEditMember(member)}
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleDeleteMember(member.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {filteredMembers.length === 0 && (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No team members found</h3>
              <p className="text-gray-600 mb-4">
                {searchQuery ? 'Try adjusting your search criteria.' : 'Get started by adding your first team member.'}
              </p>
              {!searchQuery && (
                <Button onClick={() => {
                  resetForm();
                  setShowAddMember(true);
                }}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add Team Member
                </Button>
              )}
            </div>
          )}
        </main>
      </div>
      {/* Edit Dialog */}
      <Dialog open={showEditMember} onOpenChange={(open) => {
        setShowEditMember(open);
        if (!open) {
          setEditingMember(null);
          resetForm();
          setMessage(null);
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Team Member</DialogTitle>
            <DialogDescription>
              Update team member information.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {message && (
              <div className={`p-3 rounded-md text-sm ${
                message.includes('success') 
                  ? 'bg-green-50 text-green-700 border border-green-200' 
                  : 'bg-red-50 text-red-700 border border-red-200'
              }`}>
                {message}
              </div>
            )}
            <div>
              <Label htmlFor="edit-name">Name *</Label>
              <Input 
                id="edit-name" 
                placeholder="Full name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="mt-2"
              />
            </div>
            <div>
              <Label htmlFor="edit-email">Email *</Label>
              <Input 
                id="edit-email" 
                type="email" 
                placeholder="email@example.com"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                className="mt-2"
              />
            </div>
            <div>
              <Label htmlFor="edit-phone">Phone</Label>
              <Input 
                id="edit-phone" 
                type="tel" 
                placeholder="(555) 123-4567"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                className="mt-2"
              />
            </div>
            <div>
              <Label htmlFor="edit-role">Role</Label>
              <Select 
                value={formData.role} 
                onValueChange={(value: any) => setFormData(prev => ({ ...prev, role: value }))}
              >
                <SelectTrigger id="edit-role" className="mt-2">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Worker">Worker</SelectItem>
                  <SelectItem value="Manager">Manager</SelectItem>
                  <SelectItem value="Admin">Admin</SelectItem>
                  <SelectItem value="Owner">Owner</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="edit-status">Status</Label>
              <Select 
                value={formData.status} 
                onValueChange={(value: any) => setFormData(prev => ({ ...prev, status: value }))}
              >
                <SelectTrigger id="edit-status" className="mt-2">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="edit-notes">Notes</Label>
              <Textarea 
                id="edit-notes" 
                placeholder="Optional notes about this team member..."
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                className="mt-2"
                rows={3}
              />
            </div>
            <div className="flex justify-end space-x-2 pt-4">
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowEditMember(false);
                  setEditingMember(null);
                  resetForm();
                  setMessage(null);
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleUpdateMember} disabled={saving}>
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
