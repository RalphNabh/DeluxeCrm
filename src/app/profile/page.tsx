'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { 
  LayoutDashboard, 
  Users, 
  FileText, 
  DollarSign,
  Zap, 
  Settings,
  ArrowLeft,
  Edit,
  Mail,
  Calendar,
  Shield
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const sidebarItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
  { icon: Users, label: "Clients", href: "/clients" },
  { icon: FileText, label: "Estimates", href: "/estimates" },
  { icon: DollarSign, label: "Invoices", href: "/invoices" },
  { icon: Calendar, label: "Calendar", href: "/calendar" },
  { icon: Zap, label: "Automations", href: "/automations" },
  { icon: Settings, label: "Settings", href: "/settings" },
];

interface UserProfile {
  id: string
  email: string
  created_at: string
  last_sign_in_at?: string
}

export default function ProfilePage() {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    fetchUserProfile()
  }, [])

  const fetchUserProfile = async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (authUser) {
        setUser({
          id: authUser.id,
          email: authUser.email || '',
          created_at: authUser.created_at,
          last_sign_in_at: authUser.last_sign_in_at
        })
      }
    } catch (error) {
      console.error('Error fetching user profile:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Unable to load profile</p>
          <Link href="/dashboard">
            <Button>Back to Dashboard</Button>
          </Link>
        </div>
      </div>
    )
  }

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
                    item.label === "Settings"
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
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/dashboard">
                <Button variant="outline" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Dashboard
                </Button>
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
            </div>
          </div>
        </header>

        {/* Profile Content */}
        <main className="flex-1 p-6">
          <div className="max-w-4xl">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Profile Card */}
              <div className="lg:col-span-1">
                <Card>
                  <CardHeader>
                    <CardTitle>Profile Picture</CardTitle>
                  </CardHeader>
                  <CardContent className="text-center">
                    <Avatar className="h-24 w-24 mx-auto mb-4">
                      <AvatarImage src="/placeholder-avatar.jpg" />
                      <AvatarFallback>
                        {user.email.split('@')[0].slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <Button variant="outline" size="sm">
                      <Edit className="h-4 w-4 mr-2" />
                      Change Photo
                    </Button>
                  </CardContent>
                </Card>
              </div>

              {/* Account Details */}
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Account Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Email Address
                        </label>
                        <div className="flex items-center p-3 border border-gray-300 rounded-md bg-gray-50">
                          <Mail className="h-4 w-4 mr-2 text-gray-500" />
                          <span className="text-gray-900">{user.email}</span>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          User ID
                        </label>
                        <div className="flex items-center p-3 border border-gray-300 rounded-md bg-gray-50">
                          <Shield className="h-4 w-4 mr-2 text-gray-500" />
                          <span className="text-gray-900 font-mono text-sm">
                            {user.id.slice(0, 8)}...
                          </span>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Member Since
                        </label>
                        <div className="flex items-center p-3 border border-gray-300 rounded-md bg-gray-50">
                          <Calendar className="h-4 w-4 mr-2 text-gray-500" />
                          <span className="text-gray-900">
                            {new Date(user.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Last Sign In
                        </label>
                        <div className="flex items-center p-3 border border-gray-300 rounded-md bg-gray-50">
                          <Calendar className="h-4 w-4 mr-2 text-gray-500" />
                          <span className="text-gray-900">
                            {user.last_sign_in_at 
                              ? new Date(user.last_sign_in_at).toLocaleDateString()
                              : 'N/A'
                            }
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-6 border-t border-gray-200">
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Account Actions</h3>
                      <div className="flex flex-wrap gap-3">
                        <Link href="/settings">
                          <Button variant="outline">
                            <Settings className="h-4 w-4 mr-2" />
                            Account Settings
                          </Button>
                        </Link>
                        <Button variant="outline">
                          <Shield className="h-4 w-4 mr-2" />
                          Change Password
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

