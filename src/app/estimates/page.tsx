"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  ChevronDown,
  Download,
  Check,
  X,
  Edit,
  Calendar,
  Phone,
  Mail,
  MapPin
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
  { icon: FileText, label: "Estimates", href: "/estimates", active: true },
  { icon: Zap, label: "Automations", href: "/automations" },
  { icon: Settings, label: "Settings", href: "/settings" },
];

// Sample estimate data
const estimateData = {
  id: "EST-2024-001",
  date: "2024-01-15",
  validUntil: "2024-02-15",
  client: {
    name: "Johnson Residence",
    address: "123 Oak Street, Springfield, IL 62701",
    phone: "(555) 123-4567",
    email: "john@email.com"
  },
  company: {
    name: "Dyluxe Landscaping",
    address: "456 Business Ave, Springfield, IL 62702",
    phone: "(555) 987-6543",
    email: "info@dyluxe.com"
  },
  lineItems: [
    {
      description: "Lawn Installation - Premium Sod (2,500 sq ft)",
      quantity: 2500,
      unit: "sq ft",
      unitPrice: 2.50,
      total: 6250
    },
    {
      description: "Mulch Application - Premium Hardwood",
      quantity: 15,
      unit: "yards",
      unitPrice: 45.00,
      total: 675
    },
    {
      description: "Stone Patio Installation (12' x 16')",
      quantity: 192,
      unit: "sq ft",
      unitPrice: 12.00,
      total: 2304
    },
    {
      description: "Landscape Design & Planning",
      quantity: 1,
      unit: "project",
      unitPrice: 500.00,
      total: 500
    }
  ],
  subtotal: 9729,
  tax: 680.03,
  total: 10409.03
};

export default function EstimatePage() {
  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-6">
          <Link href="/" className="text-xl font-bold text-blue-600">DyluxePro</Link>
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
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-semibold text-gray-900">Estimate #{estimateData.id}</h1>
              <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                Pending Approval
              </span>
            </div>
            
            <div className="flex items-center space-x-4">
              <Button variant="outline" size="sm">
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Download PDF
              </Button>
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                <Check className="h-4 w-4 mr-2" />
                Approve Estimate
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

        {/* Estimate Content */}
        <main className="flex-1 p-6">
          <div className="max-w-4xl mx-auto">
            {/* Estimate Header */}
            <Card className="mb-6 border-0 shadow-lg">
              <CardHeader className="bg-blue-50 border-b border-blue-100">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-2xl text-blue-800">{estimateData.company.name}</CardTitle>
                    <p className="text-blue-600 mt-1">Professional Landscaping Services</p>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-semibold text-blue-800">ESTIMATE</div>
                    <div className="text-sm text-blue-600">#{estimateData.id}</div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid md:grid-cols-2 gap-8">
                  {/* Company Info */}
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3">From:</h3>
                    <div className="space-y-2 text-sm">
                      <div className="font-medium">{estimateData.company.name}</div>
                      <div className="flex items-center text-gray-600">
                        <MapPin className="h-4 w-4 mr-2" />
                        {estimateData.company.address}
                      </div>
                      <div className="flex items-center text-gray-600">
                        <Phone className="h-4 w-4 mr-2" />
                        {estimateData.company.phone}
                      </div>
                      <div className="flex items-center text-gray-600">
                        <Mail className="h-4 w-4 mr-2" />
                        {estimateData.company.email}
                      </div>
                    </div>
                  </div>

                  {/* Client Info */}
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3">To:</h3>
                    <div className="space-y-2 text-sm">
                      <div className="font-medium">{estimateData.client.name}</div>
                      <div className="flex items-center text-gray-600">
                        <MapPin className="h-4 w-4 mr-2" />
                        {estimateData.client.address}
                      </div>
                      <div className="flex items-center text-gray-600">
                        <Phone className="h-4 w-4 mr-2" />
                        {estimateData.client.phone}
                      </div>
                      <div className="flex items-center text-gray-600">
                        <Mail className="h-4 w-4 mr-2" />
                        {estimateData.client.email}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid md:grid-cols-3 gap-6 mt-6 pt-6 border-t border-gray-200">
                  <div>
                    <div className="text-sm text-gray-500">Estimate Date</div>
                    <div className="font-medium">{new Date(estimateData.date).toLocaleDateString()}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Valid Until</div>
                    <div className="font-medium">{new Date(estimateData.validUntil).toLocaleDateString()}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Status</div>
                    <div className="font-medium text-blue-600">Pending Approval</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Line Items */}
            <Card className="mb-6 border-0 shadow-lg">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-4 text-left text-sm font-medium text-gray-900">Description</th>
                        <th className="px-6 py-4 text-right text-sm font-medium text-gray-900">Quantity</th>
                        <th className="px-6 py-4 text-right text-sm font-medium text-gray-900">Unit Price</th>
                        <th className="px-6 py-4 text-right text-sm font-medium text-gray-900">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {estimateData.lineItems.map((item, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-6 py-4 text-sm">
                            <div className="font-medium text-gray-900">{item.description}</div>
                          </td>
                          <td className="px-6 py-4 text-sm text-right text-gray-600">
                            {item.quantity.toLocaleString()} {item.unit}
                          </td>
                          <td className="px-6 py-4 text-sm text-right text-gray-600">
                            ${item.unitPrice.toFixed(2)}
                          </td>
                          <td className="px-6 py-4 text-sm text-right font-medium text-gray-900">
                            ${item.total.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Totals */}
                <div className="bg-gray-50 px-6 py-4">
                  <div className="flex justify-end">
                    <div className="w-64 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Subtotal:</span>
                        <span className="font-medium">${estimateData.subtotal.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Tax (7%):</span>
                        <span className="font-medium">${estimateData.tax.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-lg font-semibold border-t border-gray-300 pt-2">
                        <span>Total:</span>
                        <span className="text-blue-600">${estimateData.total.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Terms and Signature */}
            <Card className="border-0 shadow-lg">
              <CardContent className="p-6">
                <div className="grid md:grid-cols-2 gap-8">
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3">Terms & Conditions</h3>
                    <div className="text-sm text-gray-600 space-y-2">
                      <p>• Payment is due within 30 days of project completion</p>
                      <p>• A 50% deposit is required to begin work</p>
                      <p>• This estimate is valid for 30 days from the date above</p>
                      <p>• All work is guaranteed for 1 year from completion date</p>
                      <p>• Weather delays may affect project timeline</p>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3">Client Approval</h3>
                    <div className="space-y-4">
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                        <div className="text-sm text-gray-500 mb-2">Client Signature</div>
                        <div className="text-xs text-gray-400">Signature will appear here after approval</div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <Input 
                          placeholder="Client Name" 
                          className="flex-1"
                          disabled
                        />
                        <Input 
                          type="date" 
                          className="flex-1"
                          disabled
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
