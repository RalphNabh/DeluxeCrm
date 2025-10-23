"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  LayoutDashboard, 
  Users, 
  FileText, 
  Zap, 
  Settings, 
  Search,
  Bell,
  User,
  ChevronDown,
  Plus,
  Filter
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import SignOutButton from "@/components/auth/sign-out";

type Lead = {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  value: number;
  status: "New Leads" | "Estimate Sent" | "Approved" | "Job Scheduled" | "Completed";
  created_at: string;
  updated_at: string;
};

const STAGES: Lead["status"][] = [
  "New Leads",
  "Estimate Sent",
  "Approved",
  "Job Scheduled",
  "Completed",
];

const sidebarItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard", active: true },
  { icon: Users, label: "Clients", href: "/clients" },
  { icon: FileText, label: "Estimates", href: "/estimates" },
  { icon: Zap, label: "Automations", href: "/automations" },
  { icon: Settings, label: "Settings", href: "/settings" },
];

export default function Dashboard() {
  const [searchQuery, setSearchQuery] = useState("");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLeads = async () => {
      try {
        const res = await fetch("/api/leads");
        if (!res.ok) throw new Error("Failed to load leads");
        const data = await res.json();
        setLeads(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error loading leads");
      } finally {
        setLoading(false);
      }
    };
    fetchLeads();
  }, []);

  const grouped = useMemo(() => {
    const map: Record<Lead["status"], Lead[]> = {
      "New Leads": [],
      "Estimate Sent": [],
      "Approved": [],
      "Job Scheduled": [],
      "Completed": [],
    };
    const filtered = leads.filter((l) =>
      [l.name, l.address, l.email, l.phone]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(searchQuery.toLowerCase())
    );
    for (const lead of filtered) map[lead.status].push(lead);
    return map;
  }, [leads, searchQuery]);

  const maxColumnLen = useMemo(
    () => Math.max(1, ...STAGES.map((s) => grouped[s].length)),
    [grouped]
  );

  async function changeLeadStatus(leadId: string, newStatus: Lead["status"]) {
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

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-6">
          <h1 className="text-xl font-bold text-blue-600">DyluxePro</h1>
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
            <div className="flex items-center space-x-4 flex-1">
              <div className="relative max-w-md flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search clients, estimates..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Filter
              </Button>
            </div>
            
            <div className="flex items-center space-x-4">
              <Link href="/clients/new">
                <Button variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  New Client
                </Button>
              </Link>
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

        {/* Dashboard Content */}
        <main className="flex-1 p-6">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Sales Pipeline</h1>
            <p className="text-gray-600">Track and manage your landscaping projects from lead to completion.</p>
          </div>

          {/* Pipeline Stats */}
          <div className="grid grid-cols-5 gap-6 mb-8">
            {STAGES.map((stage) => (
              <Card key={stage} className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <div className="text-center">
                    <h3 className="font-semibold text-gray-900 mb-1">{stage}</h3>
                    <div className="text-2xl font-bold text-blue-600 mb-1">{grouped[stage].length}</div>
                    <div className="text-sm text-gray-500">
                      ${grouped[stage]
                        .reduce((sum, lead) => sum + (lead.value ?? 0), 0)
                        .toLocaleString()}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Sales Pipeline Board */}
          <div className="grid grid-cols-5 gap-6">
            {STAGES.map((stage) => (
              <div key={stage} className="space-y-4">
                <div className="text-center">
                  <h3 className="font-semibold text-gray-900 mb-2">{stage}</h3>
                  <div className="w-full h-1 bg-gray-200 rounded-full">
                    <div 
                      className="h-1 bg-blue-500 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min((grouped[stage].length / maxColumnLen) * 100, 100)}%` }}
                    ></div>
                  </div>
                </div>
                
                <div className="space-y-3">
                  {grouped[stage].map((client) => (
                    <Card 
                      key={client.id}
                      className="p-4 hover:shadow-md transition-all duration-200 cursor-pointer border border-gray-200 hover:border-blue-300 group"
                      draggable
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-medium text-gray-900 text-sm group-hover:text-blue-700">
                              {client.name}
                            </h4>
                            <p className="text-xs text-gray-500 mt-1">{client.address}</p>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-semibold text-blue-600">
                              ${client.value.toLocaleString()}
                            </div>
                            <div className="flex items-center gap-1 mt-2">
                              {(() => {
                                const idx = STAGES.indexOf(client.status);
                                const prev = idx > 0 ? STAGES[idx - 1] : null;
                                const next = idx < STAGES.length - 1 ? STAGES[idx + 1] : null;
                                return (
                                  <>
                                    <Button
                                      variant="outline"
                                      size="icon"
                                      className="h-7 w-7"
                                      disabled={!prev}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (prev) changeLeadStatus(client.id, prev);
                                      }}
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
                                        if (next) changeLeadStatus(client.id, next);
                                      }}
                                    >
                                      ▶
                                    </Button>
                                  </>
                                );
                              })()}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span>{client.phone}</span>
                          <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                        </div>
                        
                        <div className="pt-2 border-t border-gray-100">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-500">Progress</span>
                            <span className="font-medium text-gray-700">
                              {stage === "New Leads" && "0%"}
                              {stage === "Estimate Sent" && "25%"}
                              {stage === "Approved" && "50%"}
                              {stage === "Job Scheduled" && "75%"}
                              {stage === "Completed" && "100%"}
                            </span>
                          </div>
                          <div className="w-full h-1 bg-gray-200 rounded-full mt-1">
                            <div 
                              className="h-1 bg-blue-500 rounded-full transition-all duration-300"
                              style={{ 
                                width: stage === "New Leads" ? "0%" :
                                       stage === "Estimate Sent" ? "25%" :
                                       stage === "Approved" ? "50%" :
                                       stage === "Job Scheduled" ? "75%" : "100%"
                              }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
          {loading && (
            <div className="text-center text-sm text-gray-500 mt-6">Loading leads...</div>
          )}
          {error && (
            <div className="text-center text-sm text-red-600 mt-6">{error}</div>
          )}
        </main>
      </div>
    </div>
  );
}
