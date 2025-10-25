'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { 
  LayoutDashboard, 
  Users, 
  FileText, 
  DollarSign,
  Calendar,
  Zap, 
  Settings,
  ArrowLeft,
  Save,
  Bell,
  Shield,
  Mail,
  Globe,
  Palette
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const sidebarItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
  { icon: Users, label: "Clients", href: "/clients" },
  { icon: FileText, label: "Estimates", href: "/estimates" },
  { icon: DollarSign, label: "Invoices", href: "/invoices" },
  { icon: Calendar, label: "Calendar", href: "/calendar" },
  { icon: Zap, label: "Automations", href: "/automations" },
  { icon: Settings, label: "Settings", href: "/settings", active: true },
];

interface UserSettings {
  email_notifications: boolean
  sms_notifications: boolean
  weekly_reports: boolean
  dark_mode: boolean
  timezone: string
  date_format: string
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<UserSettings>({
    email_notifications: true,
    sms_notifications: false,
    weekly_reports: true,
    dark_mode: false,
    timezone: 'America/New_York',
    date_format: 'MM/DD/YYYY'
  })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    // Load user settings from localStorage or API
    const savedSettings = localStorage.getItem('user-settings')
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings))
    }
  }, [])

  const handleSaveSettings = async () => {
    setLoading(true)
    setMessage(null)
    
    try {
      // Save to localStorage (in a real app, you'd save to your database)
      localStorage.setItem('user-settings', JSON.stringify(settings))
      setMessage('Settings saved successfully!')
    } catch (error) {
      setMessage('Failed to save settings. Please try again.')
    } finally {
      setLoading(false)
      setTimeout(() => setMessage(null), 3000)
    }
  }

  const handleToggle = (key: keyof UserSettings) => {
    setSettings(prev => ({
      ...prev,
      [key]: !prev[key]
    }))
  }

  const handleInputChange = (key: keyof UserSettings, value: string) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }))
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
              <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
            </div>
          </div>
        </header>

        {/* Settings Content */}
        <main className="flex-1 p-6">
          <div className="max-w-4xl space-y-6">
            {message && (
              <div className={`rounded-md p-4 ${
                message.includes('success') 
                  ? 'bg-green-50 text-green-700 border border-green-200' 
                  : 'bg-red-50 text-red-700 border border-red-200'
              }`}>
                {message}
              </div>
            )}

            {/* Notifications Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Bell className="h-5 w-5 mr-2" />
                  Notifications
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-gray-900">Email Notifications</h3>
                    <p className="text-sm text-gray-600">Receive notifications via email</p>
                  </div>
                  <Switch
                    checked={settings.email_notifications}
                    onCheckedChange={() => handleToggle('email_notifications')}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-gray-900">SMS Notifications</h3>
                    <p className="text-sm text-gray-600">Receive notifications via SMS</p>
                  </div>
                  <Switch
                    checked={settings.sms_notifications}
                    onCheckedChange={() => handleToggle('sms_notifications')}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-gray-900">Weekly Reports</h3>
                    <p className="text-sm text-gray-600">Receive weekly business reports</p>
                  </div>
                  <Switch
                    checked={settings.weekly_reports}
                    onCheckedChange={() => handleToggle('weekly_reports')}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Appearance Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Palette className="h-5 w-5 mr-2" />
                  Appearance
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-gray-900">Dark Mode</h3>
                    <p className="text-sm text-gray-600">Use dark theme for the application</p>
                  </div>
                  <Switch
                    checked={settings.dark_mode}
                    onCheckedChange={() => handleToggle('dark_mode')}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Timezone
                    </label>
                    <select
                      value={settings.timezone}
                      onChange={(e) => handleInputChange('timezone', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="America/New_York">Eastern Time</option>
                      <option value="America/Chicago">Central Time</option>
                      <option value="America/Denver">Mountain Time</option>
                      <option value="America/Los_Angeles">Pacific Time</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Date Format
                    </label>
                    <select
                      value={settings.date_format}
                      onChange={(e) => handleInputChange('date_format', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                      <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                      <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                    </select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Account Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Shield className="h-5 w-5 mr-2" />
                  Account
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-gray-900">Change Password</h3>
                    <p className="text-sm text-gray-600">Update your account password</p>
                  </div>
                  <Button variant="outline">Change</Button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-gray-900">Export Data</h3>
                    <p className="text-sm text-gray-600">Download your data</p>
                  </div>
                  <Button variant="outline">Export</Button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-red-600">Delete Account</h3>
                    <p className="text-sm text-gray-600">Permanently delete your account</p>
                  </div>
                  <Button variant="destructive">Delete</Button>
                </div>
              </CardContent>
            </Card>

            {/* Save Button */}
            <div className="flex justify-end">
              <Button 
                onClick={handleSaveSettings}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Settings
                  </>
                )}
              </Button>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

