"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
  Plus,
  Filter,
  Phone,
  Mail,
  MapPin,
  Eye,
  Edit,
  Trash2,
  CheckCircle,
  Tag,
  Folder,
  CheckSquare,
  Gift
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
import FolderManager from "@/components/clients/folder-manager";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const sidebarItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
  { icon: Users, label: "Clients", href: "/clients", active: true },
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

interface ClientFolder {
  id: string;
  name: string;
  color: string;
  description?: string;
}

interface Client {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  notes?: string;
  tags?: string[];
  folder_id?: string;
  total_value?: number;
  created_at: string;
  updated_at: string;
  client_folders?: ClientFolder;
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [folders, setFolders] = useState<ClientFolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [availableTags, setAvailableTags] = useState<string[]>([]);

  useEffect(() => {
    fetchClients();
    fetchFolders();
  }, [debouncedQuery, selectedFolderId, selectedTag]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(t);
  }, [query]);

  const fetchClients = async () => {
    try {
      const url = debouncedQuery ? `/api/clients?q=${encodeURIComponent(debouncedQuery)}` : '/api/clients';
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch clients');
      }
      const data = await response.json();
      
      // Extract all unique tags from clients
      const allTags = new Set<string>()
      data.forEach((client: Client) => {
        if (client.tags && Array.isArray(client.tags)) {
          client.tags.forEach(tag => allTags.add(tag))
        }
      })
      setAvailableTags(Array.from(allTags).sort())

      // Filter by folder if selected
      let filteredData = data;
      if (selectedFolderId) {
        filteredData = filteredData.filter((client: Client) => client.folder_id === selectedFolderId);
      }

      // Filter by tag if selected
      if (selectedTag) {
        filteredData = filteredData.filter((client: Client) => 
          client.tags && Array.isArray(client.tags) && client.tags.includes(selectedTag)
        );
      }
      
      setClients(filteredData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const fetchFolders = async () => {
    try {
      const response = await fetch('/api/client-folders');
      if (response.ok) {
        const data = await response.json();
        setFolders(data || []);
      }
    } catch (err) {
      // Silently fail if folders don't exist yet
      console.log('Folders not available:', err);
    }
  };

  const handleDeleteClient = async (id: string) => {
    if (!confirm('Are you sure you want to delete this client?')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/clients/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete client');
      }
      
      setClients(clients.filter(client => client.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete client');
    }
  };

  const handleMoveToFolder = async (clientId: string, folderId: string | null) => {
    try {
      const response = await fetch(`/api/clients/${clientId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folder_id: folderId }),
      });

      if (!response.ok) {
        throw new Error('Failed to move client');
      }

      // Refresh clients list
      fetchClients();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to move client');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center transition-colors">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading clients...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center transition-colors">
        <div className="text-center">
          <p className="text-red-600 mb-4">Error: {error}</p>
          <Button onClick={fetchClients}>Try Again</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex transition-colors">
      {/* Sidebar */}
      <PageSidebar items={sidebarItems.map(item => ({
        ...item,
        active: item.active || false
      }))} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Bar */}
        <PageHeader
          title="Clients"
          description="Manage your client relationships and track project history."
          searchPlaceholder="Search clients..."
          searchValue={query}
          onSearchChange={setQuery}
          showSearch={true}
          primaryAction={
            <Link href="/clients/new">
              <Button variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                New Client
              </Button>
            </Link>
          }
          filters={
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              Filter
            </Button>
          }
        />

          {/* Clients Content */}
        <main className="flex-1 p-6">

          {/* Folder Manager */}
          <div className="mb-6 space-y-4">
            <FolderManager
              folders={folders}
              onFoldersChange={() => {
                fetchFolders();
                fetchClients();
              }}
              selectedFolderId={selectedFolderId}
              onFolderSelect={setSelectedFolderId}
            />

            {/* Tag Filter */}
            {availableTags.length > 0 && (
              <div className="flex items-center space-x-2 flex-wrap gap-2">
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
            )}
          </div>

          {/* Stats Cards */}
          <StatsCards
            stats={[
              {
                label: "Total Clients",
                value: clients.length,
                icon: Users,
                iconColor: "text-blue-600",
                iconBg: "bg-blue-100"
              },
              {
                label: "Active Clients",
                value: clients.length,
                icon: CheckCircle,
                iconColor: "text-blue-600",
                iconBg: "bg-blue-100"
              },
              {
                label: "Total Value",
                value: formatCurrencyWithSymbol(clients.reduce((sum, c) => sum + Number(c.total_value || 0), 0)),
                icon: DollarSign,
                iconColor: "text-orange-600",
                iconBg: "bg-orange-100"
              },
              {
                label: "Follow-ups Due",
                value: 0,
                icon: Calendar,
                iconColor: "text-purple-600",
                iconBg: "bg-purple-100"
              }
            ]}
          />

          {/* Clients Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {clients.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No clients yet</h3>
                <p className="text-gray-600 mb-4">Get started by adding your first client.</p>
                <Link href="/clients/new">
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add First Client
                  </Button>
                </Link>
              </div>
            ) : (
              clients.map((client) => (
                <Card key={client.id} className="border-0 shadow-lg hover:shadow-xl transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-3 flex-1">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src="/placeholder-avatar.jpg" />
                          <AvatarFallback>{client.name.split(' ').map(n => n[0]).join('').toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <h3 className="font-semibold text-gray-900 truncate">{client.name}</h3>
                            {client.client_folders && (
                              <span
                                className="px-2 py-0.5 text-xs font-medium rounded-full whitespace-nowrap"
                                style={{
                                  backgroundColor: `${client.client_folders.color}20`,
                                  color: client.client_folders.color,
                                }}
                              >
                                {client.client_folders.name}
                              </span>
                            )}
                          </div>
                          {client.tags && client.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {client.tags.map((tag, idx) => (
                                <span
                                  key={idx}
                                  className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700"
                                >
                                  <Tag className="h-3 w-3 mr-1" />
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <ChevronDown className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/clients/${client.id}`}>
                              <span className="flex items-center">
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                              </span>
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/clients/${client.id}/edit`}>
                              <span className="flex items-center">
                                <Edit className="h-4 w-4 mr-2" />
                                Edit Client
                              </span>
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/estimates/new?clientId=${client.id}`}>
                              <span className="flex items-center">
                                <FileText className="h-4 w-4 mr-2" />
                                Create Estimate
                              </span>
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="text-red-600"
                            onClick={() => handleDeleteClient(client.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      
                      {/* Quick Move Folder Dropdown */}
                      {folders.length > 0 && (
                        <div className="mt-2">
                          <Select
                            value={client.folder_id || "none"}
                            onValueChange={(value) => handleMoveToFolder(client.id, value === "none" ? null : value)}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <Folder className="h-3 w-3 mr-2" />
                              <SelectValue placeholder="Move to folder" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">No Folder</SelectItem>
                              {folders.map((folder) => (
                                <SelectItem key={folder.id} value={folder.id}>
                                  <div className="flex items-center space-x-2">
                                    <div
                                      className="w-3 h-3 rounded-full"
                                      style={{ backgroundColor: folder.color }}
                                    />
                                    <span>{folder.name}</span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>

                    <div className="space-y-3">
                      {client.email && (
                        <div className="flex items-center text-sm text-gray-600">
                          <Mail className="h-4 w-4 mr-2" />
                          {client.email}
                        </div>
                      )}
                      {client.phone && (
                        <div className="flex items-center text-sm text-gray-600">
                          <Phone className="h-4 w-4 mr-2" />
                          {client.phone}
                        </div>
                      )}
                      {client.address && (
                        <div className="flex items-start text-sm text-gray-600">
                          <MapPin className="h-4 w-4 mr-2 mt-0.5" />
                          {client.address}
                        </div>
                      )}
                      {client.notes && (
                        <div className="text-sm text-gray-600">
                          <p className="line-clamp-2">{client.notes}</p>
                        </div>
                      )}
                    </div>

                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>Added {new Date(client.created_at).toLocaleDateString()}</span>
                        <span>Updated {new Date(client.updated_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
