'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { 
  LayoutDashboard, 
  Users, 
  FileText, 
  DollarSign,
  Calendar,
  BarChart3,
  Zap, 
  Settings,
  ArrowLeft,
  Save,
  Bell,
  Shield,
  Mail,
  Globe,
  CheckCircle,
  Download,
  Trash2,
  Lock,
  CheckSquare,
  Gift,
  CreditCard,
  Loader2
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import SignOutButton from "@/components/auth/sign-out";
import UserProfile from "@/components/layout/user-profile";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ChevronDown } from 'lucide-react'

const sidebarItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
  { icon: Users, label: "Clients", href: "/clients" },
  { icon: FileText, label: "Estimates", href: "/estimates" },
  { icon: DollarSign, label: "Invoices", href: "/invoices" },
  { icon: Calendar, label: "Calendar", href: "/calendar" },
  { icon: CheckSquare, label: "Tasks", href: "/tasks" },
  { icon: BarChart3, label: "Reports", href: "/reports" },
  { icon: Users, label: "Team", href: "/team" },
  { icon: Zap, label: "Automations", href: "/automations" },
  { icon: Gift, label: "Affiliates", href: "/affiliates" },
  { icon: Settings, label: "Settings", href: "/settings", active: true },
];

// Add Profile link to sidebar items - we'll add it to the dropdown menu

interface UserSettings {
  email_notifications: boolean
  sms_notifications: boolean
  weekly_reports: boolean
  timezone: string
  date_format: string
}

export default function SettingsPage() {
  const router = useRouter()
  const [settings, setSettings] = useState<UserSettings>({
    email_notifications: true,
    sms_notifications: false,
    weekly_reports: true,
    timezone: 'America/New_York',
    date_format: 'MM/DD/YYYY'
  })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [showPasswordDialog, setShowPasswordDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [changingPassword, setChangingPassword] = useState(false)
  const [deletingAccount, setDeletingAccount] = useState(false)
  const [subscriptionStatus, setSubscriptionStatus] = useState<any>(null)
  const [loadingSubscription, setLoadingSubscription] = useState(true)
  const [portalLoading, setPortalLoading] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    // Load user settings from localStorage
    const savedSettings = localStorage.getItem('user-settings')
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings))
    }
    fetchSubscriptionStatus()
  }, [])

  const fetchSubscriptionStatus = async () => {
    try {
      const response = await fetch('/api/stripe/subscription-status')
      if (response.ok) {
        const data = await response.json()
        setSubscriptionStatus(data)
      }
    } catch (error) {
      console.error('Error fetching subscription status:', error)
    } finally {
      setLoadingSubscription(false)
    }
  }

  const handleManageSubscription = async () => {
    setPortalLoading(true)
    try {
      const response = await fetch('/api/stripe/customer-portal', {
        method: 'POST',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create portal session')
      }

      // Redirect to Stripe Customer Portal
      if (data.url) {
        window.location.href = data.url
      }
    } catch (error) {
      console.error('Error opening customer portal:', error)
      setMessage(error instanceof Error ? error.message : 'Failed to open customer portal')
      setTimeout(() => setMessage(null), 3000)
    } finally {
      setPortalLoading(false)
    }
  }


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
    const newSettings = {
      ...settings,
      [key]: !settings[key]
    }
    setSettings(newSettings)
    // Auto-save toggle changes
    localStorage.setItem('user-settings', JSON.stringify(newSettings))
  }

  const handleInputChange = (key: keyof UserSettings, value: string) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }))
  }

  const handleChangePassword = async () => {
    if (!passwordData.newPassword || !passwordData.confirmPassword) {
      setMessage('Please fill in all password fields')
      return
    }

    if (passwordData.newPassword.length < 6) {
      setMessage('New password must be at least 6 characters')
      return
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setMessage('New passwords do not match')
      return
    }

    setChangingPassword(true)
    setMessage(null)

    try {
      // Update password using Supabase
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword
      })

      if (error) {
        setMessage(error.message)
      } else {
        setMessage('Password changed successfully!')
        setShowPasswordDialog(false)
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
      }
    } catch (error) {
      setMessage('Failed to change password. Please try again.')
    } finally {
      setChangingPassword(false)
      setTimeout(() => setMessage(null), 3000)
    }
  }

  const handleExportData = async () => {
    setLoading(true)
    try {
      // Fetch all user data
      const [clientsRes, estimatesRes, invoicesRes, jobsRes] = await Promise.all([
        fetch('/api/clients').then(r => r.json()),
        fetch('/api/estimates').then(r => r.json()),
        fetch('/api/invoices').then(r => r.json()),
        fetch('/api/jobs').then(r => r.json())
      ])

      const exportData = {
        exported_at: new Date().toISOString(),
        clients: clientsRes,
        estimates: estimatesRes,
        invoices: invoicesRes,
        jobs: jobsRes,
        settings: settings
      }

      // Create downloadable JSON file
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `dyluxepro-export-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      setMessage('Data exported successfully!')
    } catch (error) {
      setMessage('Failed to export data. Please try again.')
    } finally {
      setLoading(false)
      setTimeout(() => setMessage(null), 3000)
    }
  }

  const handleDeleteAccount = async () => {
    setDeletingAccount(true)
    setMessage(null)

    try {
      // Call backend API to delete account
      const response = await fetch('/api/user/delete-account', {
        method: 'DELETE'
      })

      if (!response.ok) {
        const errorData = await response.json()
        setMessage(errorData.error || 'Failed to delete account. Please contact support.')
      } else {
        setMessage('Account deleted successfully. Redirecting...')
        // Sign out and redirect
        await supabase.auth.signOut()
        setTimeout(() => {
          router.push('/login')
        }, 2000)
      }
    } catch (error) {
      setMessage('Failed to delete account. Please contact support.')
    } finally {
      setDeletingAccount(false)
      setTimeout(() => setMessage(null), 5000)
    }
  }


  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col h-screen transition-colors">
        <div className="p-6 flex-shrink-0">
          <Link href="/" className="text-xl font-bold text-blue-600 dark:text-blue-400">DyluxePro</Link>
        </div>
        
        <nav className="flex-1 px-4 overflow-y-auto min-h-0">
          <ul className="space-y-2">
            {sidebarItems.map((item) => (
              <li key={item.label}>
                <Link
                  href={item.href}
                  className={`flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                    item.active
                      ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-r-2 border-blue-600 dark:border-blue-400"
                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white"
                  }`}
                >
                  <item.icon className="h-5 w-5 mr-3" />
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex-shrink-0 mt-auto">
          <UserProfile />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 transition-colors">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/dashboard">
                <Button variant="outline" size="sm" className="dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Dashboard
                </Button>
              </Link>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm" className="dark:hover:bg-gray-700">
                <Bell className="h-4 w-4 dark:text-gray-300" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="dark:hover:bg-gray-700">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src="/placeholder-avatar.jpg" />
                      <AvatarFallback>JD</AvatarFallback>
                    </Avatar>
                    <ChevronDown className="h-4 w-4 ml-2 dark:text-gray-300" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="dark:bg-gray-800 dark:border-gray-700">
                  <DropdownMenuItem asChild>
                    <Link href="/profile" className="dark:text-gray-300 dark:hover:bg-gray-700">Profile</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/settings" className="dark:text-gray-300 dark:hover:bg-gray-700">Settings</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <SignOutButton />
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        {/* Settings Content */}
        <main className="flex-1 p-6">
          <div className="max-w-4xl space-y-6">
            {message && (
              <div className={`rounded-md p-4 border transition-all ${
                message.includes('success') 
                  ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800' 
                  : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800'
              }`}>
                <div className="flex items-center">
                  {message.includes('success') && <CheckCircle className="h-5 w-5 mr-2" />}
                  {message}
                </div>
              </div>
            )}

            {/* General Settings */}
            <Card className="border-gray-200 bg-white">
              <CardHeader>
                <CardTitle className="flex items-center text-gray-900">
                  <Globe className="h-5 w-5 mr-2 text-blue-600" />
                  General
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Timezone
                    </label>
                    <select
                      value={settings.timezone}
                      onChange={(e) => handleInputChange('timezone', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                      <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                      <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                    </select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Notifications Settings */}
            <Card className="border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 transition-colors">
              <CardHeader>
                <CardTitle className="flex items-center text-gray-900 dark:text-white">
                  <Bell className="h-5 w-5 mr-2 text-blue-600 dark:text-blue-400" />
                  Notifications
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between p-4 rounded-lg bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700">
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white">Email Notifications</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Receive notifications via email</p>
                  </div>
                  <Switch
                    checked={settings.email_notifications}
                    onCheckedChange={() => handleToggle('email_notifications')}
                  />
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700">
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white">SMS Notifications</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Receive notifications via SMS</p>
                  </div>
                  <Switch
                    checked={settings.sms_notifications}
                    onCheckedChange={() => handleToggle('sms_notifications')}
                  />
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700">
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white">Weekly Reports</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Receive weekly business reports</p>
                  </div>
                  <Switch
                    checked={settings.weekly_reports}
                    onCheckedChange={() => handleToggle('weekly_reports')}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Subscription Settings */}
            <Card className="border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 transition-colors">
              <CardHeader>
                <CardTitle className="flex items-center text-gray-900 dark:text-white">
                  <CreditCard className="h-5 w-5 mr-2 text-blue-600 dark:text-blue-400" />
                  Subscription
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {loadingSubscription ? (
                  <div className="flex items-center justify-center p-8">
                    <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                  </div>
                ) : subscriptionStatus?.isActive ? (
                  <div className="space-y-4">
                    <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                      <div className="flex items-center mb-2">
                        <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 mr-2" />
                        <h3 className="font-medium text-green-800 dark:text-green-300">Active Subscription</h3>
                      </div>
                      <p className="text-sm text-green-700 dark:text-green-400">
                        Status: <span className="font-medium capitalize">{subscriptionStatus.status}</span>
                      </p>
                      {subscriptionStatus.subscription?.current_period_end && (
                        <p className="text-sm text-green-700 dark:text-green-400 mt-1">
                          Renews: {new Date(subscriptionStatus.subscription.current_period_end).toLocaleDateString()}
                        </p>
                      )}
                      {subscriptionStatus.subscription?.cancel_at_period_end && (
                        <p className="text-sm text-orange-700 dark:text-orange-400 mt-1">
                          Subscription will cancel at the end of the billing period
                        </p>
                      )}
                    </div>
                    <Button
                      onClick={handleManageSubscription}
                      disabled={portalLoading}
                      className="w-full dark:bg-blue-600 dark:hover:bg-blue-700"
                    >
                      {portalLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Loading...
                        </>
                      ) : (
                        <>
                          <CreditCard className="h-4 w-4 mr-2" />
                          Manage Subscription
                        </>
                      )}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="p-4 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
                      <h3 className="font-medium text-yellow-800 dark:text-yellow-300 mb-2">No Active Subscription</h3>
                      <p className="text-sm text-yellow-700 dark:text-yellow-400">
                        Subscribe to access all features of DyluxePro CRM.
                      </p>
                    </div>
                    <Link href="/subscription">
                      <Button className="w-full dark:bg-blue-600 dark:hover:bg-blue-700">
                        <CreditCard className="h-4 w-4 mr-2" />
                        View Plans
                      </Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Account Settings */}
            <Card className="border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 transition-colors">
              <CardHeader>
                <CardTitle className="flex items-center text-gray-900 dark:text-white">
                  <Shield className="h-5 w-5 mr-2 text-blue-600 dark:text-blue-400" />
                  Account
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-lg bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700">
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white">Change Password</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Update your account password</p>
                  </div>
                  <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700">
                        <Lock className="h-4 w-4 mr-2" />
                        Change
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Change Password</DialogTitle>
                        <DialogDescription>
                          Enter your new password. Make sure it's at least 6 characters long.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div>
                          <Label htmlFor="newPassword">New Password</Label>
                          <Input
                            id="newPassword"
                            type="password"
                            value={passwordData.newPassword}
                            onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                            className="mt-2"
                            placeholder="Enter new password"
                          />
                        </div>
                        <div>
                          <Label htmlFor="confirmPassword">Confirm New Password</Label>
                          <Input
                            id="confirmPassword"
                            type="password"
                            value={passwordData.confirmPassword}
                            onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                            className="mt-2"
                            placeholder="Confirm new password"
                          />
                        </div>
                        <div className="flex justify-end space-x-2 pt-4">
                          <Button variant="outline" onClick={() => {
                            setShowPasswordDialog(false)
                            setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
                          }}>
                            Cancel
                          </Button>
                          <Button onClick={handleChangePassword} disabled={changingPassword}>
                            {changingPassword ? 'Changing...' : 'Change Password'}
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700">
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white">Export Data</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Download all your data as JSON</p>
                  </div>
                  <Button 
                    variant="outline" 
                    className="dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                    onClick={handleExportData}
                    disabled={loading}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                  <div>
                    <h3 className="font-medium text-red-600 dark:text-red-400">Delete Account</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Permanently delete your account and all data</p>
                  </div>
                  <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                    <DialogTrigger asChild>
                      <Button variant="destructive" disabled={deletingAccount}>
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle className="text-red-600">Delete Account</DialogTitle>
                        <DialogDescription>
                          This action cannot be undone. This will permanently delete your account and all associated data including clients, estimates, invoices, and jobs.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                          <p className="text-sm text-red-800 dark:text-red-200 mb-2">
                            <strong>Warning:</strong> This will permanently delete:
                          </p>
                          <ul className="list-disc list-inside text-sm text-red-700 dark:text-red-300 space-y-1 mb-3">
                            <li>All your clients</li>
                            <li>All your estimates</li>
                            <li>All your invoices</li>
                            <li>All your jobs</li>
                            <li>All your settings and preferences</li>
                          </ul>
                          <p className="text-xs text-red-600 dark:text-red-400 mt-3">
                            You will be signed out immediately after deletion. This action cannot be undone.
                          </p>
                        </div>
                        <div className="flex justify-end space-x-2 pt-4">
                          <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
                            Cancel
                          </Button>
                          <Button variant="destructive" onClick={handleDeleteAccount} disabled={deletingAccount}>
                            {deletingAccount ? 'Deleting...' : 'Permanently Delete Account'}
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardContent>
            </Card>

            {/* Save Button */}
            <div className="flex justify-end">
              <Button 
                onClick={handleSaveSettings}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700"
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
