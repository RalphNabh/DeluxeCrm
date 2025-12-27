'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
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
  Edit,
  Mail,
  Shield,
  Phone,
  MapPin,
  Building,
  Briefcase,
  Save,
  User,
  Calendar as CalendarIcon,
  Globe,
  Menu
} from 'lucide-react'
import UserProfile from '@/components/layout/user-profile'
import PageSidebar from '@/components/layout/page-sidebar'

const sidebarItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
  { icon: Users, label: "Clients", href: "/clients" },
  { icon: FileText, label: "Estimates", href: "/estimates" },
  { icon: DollarSign, label: "Invoices", href: "/invoices" },
  { icon: Calendar, label: "Calendar", href: "/calendar" },
  { icon: BarChart3, label: "Reports", href: "/reports" },
  { icon: Users, label: "Team", href: "/team" },
  { icon: Zap, label: "Automations", href: "/automations" },
  { icon: Settings, label: "Settings", href: "/settings" },
];

interface UserProfileData {
  id: string
  user_id: string
  email: string
  first_name?: string
  last_name?: string
  full_name?: string
  date_of_birth?: string
  phone?: string
  address?: string
  city?: string
  state?: string
  zip_code?: string
  country?: string
  company_name?: string
  job_title?: string
  business_type?: string
  avatar_url?: string
  created_at: string
  updated_at?: string
  last_sign_in_at?: string
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    full_name: '',
    date_of_birth: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zip_code: '',
    country: 'US',
    company_name: '',
    job_title: '',
    business_type: ''
  })

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      const response = await fetch('/api/user/profile')
      if (!response.ok) {
        throw new Error('Failed to fetch profile')
      }
      const data = await response.json()
      setProfile(data)
      
      // Populate form data
      setFormData({
        first_name: data.first_name || '',
        last_name: data.last_name || '',
        full_name: data.full_name || '',
        date_of_birth: data.date_of_birth || '',
        phone: data.phone || '',
        address: data.address || '',
        city: data.city || '',
        state: data.state || '',
        zip_code: data.zip_code || '',
        country: data.country || 'US',
        company_name: data.company_name || '',
        job_title: data.job_title || '',
        business_type: data.business_type || ''
      })
    } catch (error) {
      console.error('Error fetching profile:', error)
      setMessage({ type: 'error', text: 'Failed to load profile' })
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setMessage(null)

    try {
      // Update full_name if first_name or last_name changed
      const fullName = formData.first_name && formData.last_name
        ? `${formData.first_name} ${formData.last_name}`
        : formData.full_name || formData.first_name || formData.last_name

      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          full_name: fullName
        })
      })

      if (!response.ok) {
        throw new Error('Failed to update profile')
      }

      const updated = await response.json()
      setProfile(updated)
      setEditing(false)
      setMessage({ type: 'success', text: 'Profile updated successfully!' })
      
      // Clear message after 3 seconds
      setTimeout(() => setMessage(null), 3000)
    } catch (error) {
      console.error('Error updating profile:', error)
      setMessage({ type: 'error', text: 'Failed to update profile' })
    } finally {
      setSaving(false)
    }
  }

  const getInitials = (profile: UserProfileData) => {
    if (profile.first_name && profile.last_name) {
      return `${profile.first_name[0]}${profile.last_name[0]}`.toUpperCase()
    }
    if (profile.full_name) {
      return profile.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    }
    if (profile.email) {
      return profile.email.split('@')[0].slice(0, 2).toUpperCase()
    }
    return 'U'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!profile) {
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
              <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
            </div>
            {!editing && (
              <Button onClick={() => setEditing(true)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit Profile
              </Button>
            )}
          </div>
        </header>

        {/* Profile Content */}
        <main className="flex-1 p-6">
          <div className="max-w-4xl mx-auto space-y-6">
            {message && (
              <div className={`p-4 rounded-lg ${
                message.type === 'success' 
                  ? 'bg-green-50 text-green-800 border border-green-200' 
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}>
                {message.text}
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Profile Picture Card */}
              <div className="lg:col-span-1">
                <Card>
                  <CardHeader>
                    <CardTitle>Profile Picture</CardTitle>
                  </CardHeader>
                  <CardContent className="text-center">
                    <Avatar className="h-32 w-32 mx-auto mb-4">
                      <AvatarImage src={profile.avatar_url || '/placeholder-avatar.jpg'} />
                      <AvatarFallback className="bg-blue-100 text-blue-700 text-2xl">
                        {getInitials(profile)}
                      </AvatarFallback>
                    </Avatar>
                    {editing && (
                      <Button variant="outline" size="sm" className="w-full">
                        <Edit className="h-4 w-4 mr-2" />
                        Change Photo
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Account Information */}
              <div className="lg:col-span-2 space-y-6">
                {/* Personal Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <User className="h-5 w-5 mr-2" />
                      Personal Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="first_name">First Name</Label>
                        {editing ? (
                          <Input
                            id="first_name"
                            value={formData.first_name}
                            onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                            className="mt-1"
                          />
                        ) : (
                          <div className="mt-1 p-3 border border-gray-300 rounded-md bg-gray-50">
                            {profile.first_name || 'Not set'}
                          </div>
                        )}
                      </div>

                      <div>
                        <Label htmlFor="last_name">Last Name</Label>
                        {editing ? (
                          <Input
                            id="last_name"
                            value={formData.last_name}
                            onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                            className="mt-1"
                          />
                        ) : (
                          <div className="mt-1 p-3 border border-gray-300 rounded-md bg-gray-50">
                            {profile.last_name || 'Not set'}
                          </div>
                        )}
                      </div>

                      <div>
                        <Label htmlFor="email">Email Address</Label>
                        <div className="mt-1 p-3 border border-gray-300 rounded-md bg-gray-50 flex items-center">
                          <Mail className="h-4 w-4 mr-2 text-gray-500" />
                          <span>{profile.email}</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
                      </div>

                      <div>
                        <Label htmlFor="date_of_birth">Date of Birth</Label>
                        {editing ? (
                          <Input
                            id="date_of_birth"
                            type="date"
                            value={formData.date_of_birth}
                            onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                            className="mt-1"
                          />
                        ) : (
                          <div className="mt-1 p-3 border border-gray-300 rounded-md bg-gray-50 flex items-center">
                            <CalendarIcon className="h-4 w-4 mr-2 text-gray-500" />
                            <span>{profile.date_of_birth ? new Date(profile.date_of_birth).toLocaleDateString() : 'Not set'}</span>
                          </div>
                        )}
                      </div>

                      <div>
                        <Label htmlFor="phone">Phone Number</Label>
                        {editing ? (
                          <Input
                            id="phone"
                            type="tel"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            className="mt-1"
                            placeholder="(555) 123-4567"
                          />
                        ) : (
                          <div className="mt-1 p-3 border border-gray-300 rounded-md bg-gray-50 flex items-center">
                            <Phone className="h-4 w-4 mr-2 text-gray-500" />
                            <span>{profile.phone || 'Not set'}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Address Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <MapPin className="h-5 w-5 mr-2" />
                      Address Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="address">Street Address</Label>
                      {editing ? (
                        <Input
                          id="address"
                          value={formData.address}
                          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                          className="mt-1"
                        />
                      ) : (
                        <div className="mt-1 p-3 border border-gray-300 rounded-md bg-gray-50">
                          {profile.address || 'Not set'}
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="city">City</Label>
                        {editing ? (
                          <Input
                            id="city"
                            value={formData.city}
                            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                            className="mt-1"
                          />
                        ) : (
                          <div className="mt-1 p-3 border border-gray-300 rounded-md bg-gray-50">
                            {profile.city || 'Not set'}
                          </div>
                        )}
                      </div>

                      <div>
                        <Label htmlFor="state">State</Label>
                        {editing ? (
                          <Input
                            id="state"
                            value={formData.state}
                            onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                            className="mt-1"
                          />
                        ) : (
                          <div className="mt-1 p-3 border border-gray-300 rounded-md bg-gray-50">
                            {profile.state || 'Not set'}
                          </div>
                        )}
                      </div>

                      <div>
                        <Label htmlFor="zip_code">Zip Code</Label>
                        {editing ? (
                          <Input
                            id="zip_code"
                            value={formData.zip_code}
                            onChange={(e) => setFormData({ ...formData, zip_code: e.target.value })}
                            className="mt-1"
                          />
                        ) : (
                          <div className="mt-1 p-3 border border-gray-300 rounded-md bg-gray-50">
                            {profile.zip_code || 'Not set'}
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="country">Country</Label>
                      {editing ? (
                        <Input
                          id="country"
                          value={formData.country}
                          onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                          className="mt-1"
                        />
                      ) : (
                        <div className="mt-1 p-3 border border-gray-300 rounded-md bg-gray-50 flex items-center">
                          <Globe className="h-4 w-4 mr-2 text-gray-500" />
                          <span>{profile.country || 'Not set'}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Business Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Building className="h-5 w-5 mr-2" />
                      Business Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="company_name">Company Name</Label>
                        {editing ? (
                          <Input
                            id="company_name"
                            value={formData.company_name}
                            onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                            className="mt-1"
                          />
                        ) : (
                          <div className="mt-1 p-3 border border-gray-300 rounded-md bg-gray-50 flex items-center">
                            <Building className="h-4 w-4 mr-2 text-gray-500" />
                            <span>{profile.company_name || 'Not set'}</span>
                          </div>
                        )}
                      </div>

                      <div>
                        <Label htmlFor="job_title">Job Title</Label>
                        {editing ? (
                          <Input
                            id="job_title"
                            value={formData.job_title}
                            onChange={(e) => setFormData({ ...formData, job_title: e.target.value })}
                            className="mt-1"
                          />
                        ) : (
                          <div className="mt-1 p-3 border border-gray-300 rounded-md bg-gray-50 flex items-center">
                            <Briefcase className="h-4 w-4 mr-2 text-gray-500" />
                            <span>{profile.job_title || 'Not set'}</span>
                          </div>
                        )}
                      </div>

                      <div className="md:col-span-2">
                        <Label htmlFor="business_type">Business Type</Label>
                        {editing ? (
                          <Input
                            id="business_type"
                            value={formData.business_type}
                            onChange={(e) => setFormData({ ...formData, business_type: e.target.value })}
                            className="mt-1"
                            placeholder="e.g., Contractor, Landscaping, Plumbing"
                          />
                        ) : (
                          <div className="mt-1 p-3 border border-gray-300 rounded-md bg-gray-50">
                            {profile.business_type || 'Not set'}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Account Metadata */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Shield className="h-5 w-5 mr-2" />
                      Account Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label>User ID</Label>
                        <div className="mt-1 p-3 border border-gray-300 rounded-md bg-gray-50">
                          <span className="font-mono text-sm">{profile.id.slice(0, 8)}...</span>
                        </div>
                      </div>

                      <div>
                        <Label>Member Since</Label>
                        <div className="mt-1 p-3 border border-gray-300 rounded-md bg-gray-50 flex items-center">
                          <CalendarIcon className="h-4 w-4 mr-2 text-gray-500" />
                          <span>{new Date(profile.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>

                      <div>
                        <Label>Last Sign In</Label>
                        <div className="mt-1 p-3 border border-gray-300 rounded-md bg-gray-50 flex items-center">
                          <CalendarIcon className="h-4 w-4 mr-2 text-gray-500" />
                          <span>{profile.last_sign_in_at ? new Date(profile.last_sign_in_at).toLocaleDateString() : 'N/A'}</span>
                        </div>
                      </div>

                      <div>
                        <Label>Profile Last Updated</Label>
                        <div className="mt-1 p-3 border border-gray-300 rounded-md bg-gray-50 flex items-center">
                          <CalendarIcon className="h-4 w-4 mr-2 text-gray-500" />
                          <span>{profile.updated_at ? new Date(profile.updated_at).toLocaleDateString() : 'N/A'}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {editing && (
                  <div className="flex justify-end space-x-3">
                    <Button variant="outline" onClick={() => {
                      setEditing(false)
                      fetchProfile() // Reset form data
                    }}>
                      Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={saving}>
                      <Save className="h-4 w-4 mr-2" />
                      {saving ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
