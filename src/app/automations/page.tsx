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
  Zap, 
  Settings, 
  Bell,
  ChevronDown,
  Plus,
  Mail,
  Calendar,
  Clock,
  User,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  Play,
  Pause,
  Edit,
  Trash2
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const sidebarItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
  { icon: Users, label: "Clients", href: "/clients" },
  { icon: FileText, label: "Estimates", href: "/estimates" },
  { icon: Zap, label: "Automations", href: "/automations", active: true },
  { icon: Settings, label: "Settings", href: "/settings" },
];

// Sample automation data
const automationData = [
  {
    id: 1,
    name: "New Lead Welcome",
    description: "Send a welcome email when a new lead is added to the system",
    trigger: "New Lead Added",
    action: "Send Email",
    icon: Mail,
    color: "bg-blue-100 text-blue-600",
    status: true,
    lastRun: "2 hours ago",
    runs: 47,
    successRate: 98
  },
  {
    id: 2,
    name: "Estimate Follow-up",
    description: "Send a follow-up email 3 days after an estimate is sent",
    trigger: "Estimate Sent",
    action: "Send Email + Create Task",
    icon: Calendar,
    color: "bg-green-100 text-green-600",
    status: true,
    lastRun: "1 day ago",
    runs: 23,
    successRate: 100
  },
  {
    id: 3,
    name: "Project Completion",
    description: "Send thank you email and request review after project completion",
    trigger: "Project Completed",
    action: "Send Email + Create Follow-up",
    icon: CheckCircle,
    color: "bg-purple-100 text-purple-600",
    status: true,
    lastRun: "3 days ago",
    runs: 12,
    successRate: 95
  },
  {
    id: 4,
    name: "Payment Reminder",
    description: "Send payment reminder emails for overdue invoices",
    trigger: "Invoice Overdue",
    action: "Send Email",
    icon: AlertCircle,
    color: "bg-orange-100 text-orange-600",
    status: false,
    lastRun: "1 week ago",
    runs: 8,
    successRate: 88
  },
  {
    id: 5,
    name: "Seasonal Maintenance",
    description: "Create seasonal maintenance reminders for existing clients",
    trigger: "Seasonal Schedule",
    action: "Create Tasks + Send Email",
    icon: Clock,
    color: "bg-teal-100 text-teal-600",
    status: true,
    lastRun: "2 weeks ago",
    runs: 156,
    successRate: 92
  },
  {
    id: 6,
    name: "Client Anniversary",
    description: "Send anniversary emails to long-term clients",
    trigger: "Client Anniversary",
    action: "Send Email",
    icon: User,
    color: "bg-pink-100 text-pink-600",
    status: false,
    lastRun: "Never",
    runs: 0,
    successRate: 0
  }
];

export default function AutomationsPage() {
  const [automations, setAutomations] = useState(automationData);

  const toggleAutomation = (id: number) => {
    setAutomations(automations.map(auto => 
      auto.id === id ? { ...auto, status: !auto.status } : auto
    ));
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-6">
          <Link href="/" className="text-xl font-bold text-green-600">DyluxePro</Link>
        </div>
        
        <nav className="flex-1 px-4">
          <ul className="space-y-2">
            {sidebarItems.map((item) => (
              <li key={item.label}>
                <Link
                  href={item.href}
                  className={`flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                    item.active
                      ? "bg-green-50 text-green-700 border-r-2 border-green-600"
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
              <h1 className="text-2xl font-bold text-gray-900">Automations</h1>
              <p className="text-gray-600 mt-1">Automate your workflow to save time and improve client experience</p>
            </div>
            
            <div className="flex items-center space-x-4">
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                New Automation
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
                  <DropdownMenuItem>Profile</DropdownMenuItem>
                  <DropdownMenuItem>Settings</DropdownMenuItem>
                  <DropdownMenuItem>Logout</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        {/* Automations Content */}
        <main className="flex-1 p-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card className="border-0 shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Zap className="h-5 w-5 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Active Automations</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {automations.filter(a => a.status).length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Play className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Runs</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {automations.reduce((sum, auto) => sum + auto.runs, 0)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <CheckCircle className="h-5 w-5 text-purple-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Success Rate</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {Math.round(automations.reduce((sum, auto) => sum + auto.successRate, 0) / automations.length)}%
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <Clock className="h-5 w-5 text-orange-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Time Saved</p>
                    <p className="text-2xl font-bold text-gray-900">24h</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Automations Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {automations.map((automation) => (
              <Card key={automation.id} className="border-0 shadow-lg hover:shadow-xl transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-lg ${automation.color}`}>
                        <automation.icon className="h-5 w-5" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{automation.name}</CardTitle>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            automation.status 
                              ? "bg-green-100 text-green-800" 
                              : "bg-gray-100 text-gray-800"
                          }`}>
                            {automation.status ? "Active" : "Inactive"}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={automation.status}
                        onCheckedChange={() => toggleAutomation(automation.id)}
                      />
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <ChevronDown className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Play className="h-4 w-4 mr-2" />
                            Test Run
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-red-600">
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <CardDescription className="mb-4">
                    {automation.description}
                  </CardDescription>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Trigger:</span>
                      <span className="font-medium text-gray-900">{automation.trigger}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Action:</span>
                      <span className="font-medium text-gray-900">{automation.action}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Last Run:</span>
                      <span className="font-medium text-gray-900">{automation.lastRun}</span>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Success Rate:</span>
                      <div className="flex items-center space-x-2">
                        <div className="w-16 h-2 bg-gray-200 rounded-full">
                          <div 
                            className="h-2 bg-green-500 rounded-full transition-all duration-300"
                            style={{ width: `${automation.successRate}%` }}
                          ></div>
                        </div>
                        <span className="font-medium text-gray-900">{automation.successRate}%</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Quick Actions */}
          <div className="mt-12">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow cursor-pointer group">
                <CardContent className="p-6">
                  <div className="flex items-center space-x-4">
                    <div className="p-3 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
                      <Plus className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Create Automation</h3>
                      <p className="text-sm text-gray-600">Set up a new workflow automation</p>
                    </div>
                    <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-gray-600 transition-colors" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow cursor-pointer group">
                <CardContent className="p-6">
                  <div className="flex items-center space-x-4">
                    <div className="p-3 bg-green-100 rounded-lg group-hover:bg-green-200 transition-colors">
                      <Play className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Test All</h3>
                      <p className="text-sm text-gray-600">Run a test of all active automations</p>
                    </div>
                    <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-gray-600 transition-colors" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow cursor-pointer group">
                <CardContent className="p-6">
                  <div className="flex items-center space-x-4">
                    <div className="p-3 bg-purple-100 rounded-lg group-hover:bg-purple-200 transition-colors">
                      <Settings className="h-6 w-6 text-purple-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Templates</h3>
                      <p className="text-sm text-gray-600">Browse automation templates</p>
                    </div>
                    <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-gray-600 transition-colors" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
