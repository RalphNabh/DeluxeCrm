import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Users, 
  FileText, 
  Zap, 
  ArrowRight, 
  CheckCircle,
  Star,
  BarChart3,
  Calendar,
  Mail,
  Phone
} from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <h1 className="text-2xl font-bold text-blue-600">DyluxePro</h1>
              </div>
            </div>
            <div className="hidden md:block">
              <div className="ml-10 flex items-baseline space-x-4">
                <Link href="#features" className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium">
                  Features
                </Link>
                <Link href="#contact" className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium">
                  Contact
                </Link>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="outline" size="sm" asChild>
                <Link href="/login">
                  Login
                </Link>
              </Button>
              <Button size="sm" asChild>
                <Link href="/signup">
                  Get Started
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
              Close more jobs,{" "}
              <span className="text-blue-600">faster.</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Organize clients, send estimates, and automate follow-ups — all in one place. 
              The CRM built specifically for contractors.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="bg-blue-600 hover:bg-blue-700" asChild>
                <Link href="/signup">
                  Get Started Free
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/login">
                  Sign In
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Everything you need to grow your business
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Streamline your contractor operations with powerful tools designed for your trade.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
                <CardTitle>Organize Clients</CardTitle>
                <CardDescription>
                  Keep all client information, project history, and communication in one place. 
                  Never lose track of a lead again.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                  <FileText className="h-6 w-6 text-blue-600" />
                </div>
                <CardTitle>Send Estimates</CardTitle>
                <CardDescription>
                  Create professional estimates in minutes. Track approval status and 
                  follow up automatically with built-in reminders.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                  <Zap className="h-6 w-6 text-blue-600" />
                </div>
                <CardTitle>Automate Workflows</CardTitle>
                <CardDescription>
                  Set up automated follow-ups, thank you emails, and task reminders. 
                  Focus on the work while we handle the admin.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* Dashboard Preview */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              See DyluxePro in action
            </h2>
            <p className="text-lg text-gray-600">
              Get a glimpse of your new workflow with our intuitive dashboard.
            </p>
          </div>
          
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-3 h-3 bg-red-400 rounded-full"></div>
                  <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                  <div className="w-3 h-3 bg-blue-400 rounded-full"></div>
                </div>
                <div className="text-sm text-gray-500">DyluxePro CRM Dashboard</div>
              </div>
            </div>
            <div className="p-4 md:p-8">
              {/* Horizontal scroll on mobile, grid on desktop */}
              <div className="overflow-x-auto -mx-4 md:mx-0 px-4 md:px-0">
                <div className="grid grid-cols-5 gap-4 md:gap-6 min-w-[800px] md:min-w-0">
                  {['New Leads', 'Estimate Sent', 'Approved', 'Job Scheduled', 'Completed'].map((stage, index) => (
                    <div key={stage} className="space-y-4 min-w-[140px]">
                      <div className="text-center">
                        <h3 className="font-semibold text-gray-900 mb-2 text-sm md:text-base whitespace-nowrap">{stage}</h3>
                        <div className="w-full h-1 bg-gray-200 rounded-full">
                          <div 
                            className="h-1 bg-blue-500 rounded-full transition-all duration-300"
                            style={{ width: `${(index + 1) * 20}%` }}
                          ></div>
                        </div>
                      </div>
                      <div className="space-y-3">
                        {index < 3 && (
                          <Card className="p-3 hover:shadow-md transition-shadow cursor-pointer">
                            <div className="text-sm font-medium text-gray-900 break-words">Johnson Residence</div>
                            <div className="text-xs text-gray-500 break-words">123 Oak Street</div>
                            <div className="text-sm font-semibold text-blue-600 mt-1">$2,450</div>
                          </Card>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-16 bg-blue-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="grid md:grid-cols-3 gap-8 text-white">
            <div>
              <div className="text-3xl font-bold mb-2">500+</div>
              <div className="text-blue-100">Contractor Companies</div>
            </div>
            <div>
              <div className="text-3xl font-bold mb-2">$2M+</div>
              <div className="text-blue-100">Revenue Managed</div>
            </div>
            <div>
              <div className="text-3xl font-bold mb-2">98%</div>
              <div className="text-blue-100">Customer Satisfaction</div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer id="contact" className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-xl font-bold text-blue-400 mb-4">DyluxePro</h3>
              <p className="text-gray-400">
                The CRM built specifically for contractors and trade professionals.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="#features" className="hover:text-white">Features</Link></li>
                <li><Link href="/login" className="hover:text-white">Login</Link></li>
                <li><Link href="/signup" className="hover:text-white">Sign Up</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Resources</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/dashboard" className="hover:text-white">Dashboard</Link></li>
                <li><Link href="#contact" className="hover:text-white">Contact</Link></li>
                <li><Link href="/settings" className="hover:text-white">Settings</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Contact</h4>
              <div className="space-y-2 text-gray-400">
                <div className="flex items-center">
                  <Mail className="h-4 w-4 mr-2" />
                  hello@dyluxepro.com
                </div>
                <div className="flex items-center">
                  <Phone className="h-4 w-4 mr-2" />
                  (613) 262-1422
                </div>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2025 DyluxePro. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}