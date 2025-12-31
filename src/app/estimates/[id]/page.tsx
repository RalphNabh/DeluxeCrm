'use client'

import { useState, useEffect, Suspense, useRef } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
  Download,
  Mail,
  Check,
  Clock,
  Phone,
  MapPin,
  X,
  Plus,
  Eye,
  Save,
  X as XIcon,
  Edit
} from 'lucide-react'
import JobCreationModal from '@/components/jobs/job-creation-modal'
import UserProfile from '@/components/layout/user-profile'
import { formatCurrencyWithSymbol } from '@/lib/utils/currency'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

interface Estimate {
  id: string;
  client_id: string;
  lead_id?: string;
  status: 'Draft' | 'Sent' | 'Approved' | 'Rejected' | 'Scheduled' | 'Completed';
  subtotal: number;
  tax: number;
  total: number;
  contract_message?: string;
  created_at: string;
  updated_at: string;
  clients?: {
    name: string;
    email?: string;
    phone?: string;
    address?: string;
  };
  estimate_line_items?: Array<{
    id: string;
    description: string;
    quantity: number;
    unit: string;
    unit_price: number;
    total: number;
  }>;
}

interface LinkedJob {
  id: string;
  title: string;
  status: string;
  start_time: string;
  end_time: string;
}

const sidebarItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
  { icon: Users, label: "Clients", href: "/clients" },
  { icon: FileText, label: "Estimates", href: "/estimates", active: true },
  { icon: DollarSign, label: "Invoices", href: "/invoices" },
  { icon: Calendar, label: "Calendar", href: "/calendar" },
  { icon: BarChart3, label: "Reports", href: "/reports" },
  { icon: Users, label: "Team", href: "/team" },
  { icon: Zap, label: "Automations", href: "/automations" },
  { icon: Settings, label: "Settings", href: "/settings" },
];

function EstimateDetailContent() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [estimate, setEstimate] = useState<Estimate | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updating, setUpdating] = useState(false)
  const [sendingEmail, setSendingEmail] = useState(false)
  const [showCreateJobModal, setShowCreateJobModal] = useState(false)
  const [linkedJobs, setLinkedJobs] = useState<LinkedJob[]>([])
  const [isEditing, setIsEditing] = useState(false)
  const [editedItems, setEditedItems] = useState<Array<{
    id?: string;
    description: string;
    quantity: number;
    unit: string;
    unit_price: number;
    total: number;
  }>>([])
  const [editedContractMessage, setEditedContractMessage] = useState('')
  const [saving, setSaving] = useState(false)
  const [generatingPDF, setGeneratingPDF] = useState(false)
  const estimateContentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (params.id) {
      fetchEstimate()
      // Check if edit mode is requested via URL param
      const editParam = searchParams.get('edit')
      if (editParam === 'true') {
        setIsEditing(true)
      }
      
      // Check if download is requested via URL param
      const downloadParam = searchParams.get('download')
      if (downloadParam === 'true' && estimate) {
        // Wait for content to load, then trigger download
        setTimeout(() => {
          handleDownloadPDF()
        }, 1500)
      }
      
      // Check if print mode is requested
      const printParam = searchParams.get('print')
      if (printParam === 'true') {
        // Hide sidebar and header when printing
        document.body.classList.add('print-mode')
        // Trigger print when page loads
        setTimeout(() => {
          window.print()
          // Remove class after printing
          setTimeout(() => {
            document.body.classList.remove('print-mode')
          }, 1000)
        }, 1000)
      }
    }
  }, [params.id, searchParams, estimate])

  const fetchEstimate = async () => {
    try {
      const response = await fetch(`/api/estimates/${params.id}`)
      if (!response.ok) {
        throw new Error('Failed to fetch estimate')
      }
      const data = await response.json()
      setEstimate(data)
      // Initialize edited items and contract message
      setEditedItems(data.estimate_line_items || [])
      setEditedContractMessage(data.contract_message || '')
      
      // Fetch linked jobs if estimate_id column exists
      try {
        const jobsResponse = await fetch('/api/jobs')
        if (jobsResponse.ok) {
          const jobs = await jobsResponse.json()
          // Filter jobs that have this estimate_id (if column exists)
          const linked = jobs.filter((job: Record<string, unknown>) => 
            job.estimate_id === data.id
          )
          setLinkedJobs(linked)
        }
      } catch (e) {
        // Column may not exist yet, ignore
        console.log('Could not fetch linked jobs:', e)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const updateEstimateStatus = async (newStatus: string) => {
    try {
      setUpdating(true)
      const response = await fetch(`/api/estimates/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })
      
      if (!response.ok) {
        throw new Error('Failed to update estimate')
      }
      
      const updated = await response.json()
      setEstimate(updated)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update estimate')
    } finally {
      setUpdating(false)
    }
  }

  const handleSaveEstimate = async (): Promise<boolean> => {
    if (!estimate) return false

    setSaving(true)
    setError(null)

    try {
      // Calculate totals from edited items
      const subtotal = editedItems.reduce((sum, item) => {
        const total = item.quantity * item.unit_price
        return sum + total
      }, 0)
      const tax = Math.round(subtotal * 0.13 * 100) / 100
      const total = subtotal + tax

      const response = await fetch(`/api/estimates/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lineItems: editedItems.map(item => ({
            description: item.description,
            quantity: item.quantity,
            unit: item.unit,
            unit_price: item.unit_price
          })),
          contract_message: editedContractMessage
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to save estimate' }))
        throw new Error(errorData.error || 'Failed to save estimate')
      }

      const updated = await response.json()
      setEstimate(updated)
      // Update edited items to match saved data
      setEditedItems(updated.estimate_line_items || [])
      setEditedContractMessage(updated.contract_message || '')
      
      // Don't close edit mode automatically - let user decide
      // setIsEditing(false)
      
      // Return success so calling function knows it worked
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save estimate')
      return false
    } finally {
      setSaving(false)
    }
  }

  const handleSaveAndSend = async () => {
    const saved = await handleSaveEstimate()
    if (saved && estimate?.clients?.email) {
      // Small delay to ensure estimate is fully saved
      setTimeout(() => {
        sendEstimateEmail()
      }, 300)
    }
  }

  const handleDownloadPDF = async () => {
    if (!estimateContentRef.current || !estimate) {
      setError('Estimate content not ready. Please try again.')
      return
    }

    setGeneratingPDF(true)
    setError(null)
    
    try {
      // Ensure element is visible and rendered
      const element = estimateContentRef.current
      if (!element || element.offsetWidth === 0 || element.offsetHeight === 0) {
        throw new Error('Element is not visible')
      }

      // Wait a bit for any dynamic content to render
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Capture the estimate content as canvas
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        width: element.scrollWidth,
        height: element.scrollHeight,
        scrollX: 0,
        scrollY: 0,
        windowWidth: element.scrollWidth,
        windowHeight: element.scrollHeight
      }).catch((err) => {
        console.error('html2canvas error:', err)
        throw new Error('Failed to capture estimate content')
      })

      if (!canvas) {
        throw new Error('Failed to create canvas')
      }

      // Calculate PDF dimensions
      const imgWidth = 210 // A4 width in mm
      const pageHeight = 297 // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width
      let heightLeft = imgHeight

      // Create PDF
      const pdf = new jsPDF('p', 'mm', 'a4')
      let position = 0

      // Convert canvas to data URL
      const imgData = canvas.toDataURL('image/png', 1.0)
      
      // Add first page
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
      heightLeft -= pageHeight

      // Add additional pages if content is longer than one page
      while (heightLeft > 0) {
        position = heightLeft - imgHeight
        pdf.addPage()
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
        heightLeft -= pageHeight
      }

      // Generate filename
      const clientName = estimate.clients?.name || 'Client'
      const estimateId = estimate.id.slice(0, 8)
      const filename = `Estimate-${estimateId}-${clientName.replace(/[^a-z0-9]/gi, '_')}.pdf`

      // Download the PDF
      pdf.save(filename)
      
      // Remove download param from URL if present
      if (searchParams.get('download') === 'true') {
        window.history.replaceState({}, '', `/estimates/${params.id}`)
      }
    } catch (error) {
      console.error('Error generating PDF:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate PDF. Please try again.'
      setError(errorMessage)
      alert(`PDF Generation Error: ${errorMessage}`)
    } finally {
      setGeneratingPDF(false)
    }
  }

  const updateItem = (index: number, field: string, value: string | number) => {
    setEditedItems(prev => prev.map((item, i) => {
      if (i === index) {
        const updated = { ...item, [field]: value }
        // Recalculate total if quantity or unit_price changed
        if (field === 'quantity' || field === 'unit_price') {
          updated.total = updated.quantity * updated.unit_price
        }
        return updated
      }
      return item
    }))
  }

  const addItem = () => {
    setEditedItems(prev => [...prev, {
      description: '',
      quantity: 1,
      unit: 'unit',
      unit_price: 0,
      total: 0
    }])
  }

  const removeItem = (index: number) => {
    setEditedItems(prev => prev.filter((_, i) => i !== index))
  }

  const sendEstimateEmail = async () => {
    if (!estimate?.clients?.email) {
      setError('Client email not found')
      return
    }

    setSendingEmail(true)
    setError(null)

    try {
      const response = await fetch('/api/email/send-estimate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          estimateId: estimate.id,
          clientEmail: estimate.clients.email,
          clientName: estimate.clients.name
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to send email' }))
        throw new Error(errorData.error || 'Failed to send email')
      }

      const result = await response.json()
      
      // Refresh estimate data to get updated status
      await fetchEstimate()
      
      // Update edited items if in edit mode
      const refreshed = await fetch(`/api/estimates/${params.id}`)
      if (refreshed.ok) {
        const refreshedData = await refreshed.json()
        setEditedItems(refreshedData.estimate_line_items || [])
        setEditedContractMessage(refreshedData.contract_message || '')
      }
      
      if (isEditing) {
        setIsEditing(false)
      }
      
      alert('Estimate sent successfully!')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send email')
    } finally {
      setSendingEmail(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Draft': return 'bg-gray-100 text-gray-800'
      case 'Sent': return 'bg-blue-100 text-blue-800'
      case 'Approved': return 'bg-green-100 text-green-800'
      case 'Rejected': return 'bg-red-100 text-red-800'
      case 'Scheduled': return 'bg-purple-100 text-purple-800'
      case 'Completed': return 'bg-emerald-100 text-emerald-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading estimate...</p>
        </div>
      </div>
    )
  }

  if (error || !estimate) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Error: {error || 'Estimate not found'}</p>
          <Link href="/estimates">
            <Button>Back to Estimates</Button>
          </Link>
        </div>
      </div>
    )
  }

  const isPrintMode = searchParams.get('print') === 'true'

  return (
    <div className={`min-h-screen bg-gray-50 flex ${isPrintMode ? 'print-mode' : ''}`}>
      {/* Sidebar */}
      {!isPrintMode && (
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col h-screen">
        <div className="p-6 flex-shrink-0">
          <Link href="/" className="text-xl font-bold text-blue-600">DyluxePro</Link>
        </div>
        
        <nav className="flex-1 px-4 overflow-y-auto min-h-0">
          <ul className="space-y-2">
            {sidebarItems.map((item) => (
              <li key={item.label}>
                <Link
                  href={item.href}
                  className={`flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                    item.label === "Estimates"
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
        <div className="flex-shrink-0 mt-auto">
          <UserProfile />
        </div>
      </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        {!isPrintMode && (
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/estimates">
                <Button variant="outline" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Estimates
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Estimate #{estimate.id.slice(0, 8)}</h1>
                <p className="text-gray-600">{estimate.clients?.name || 'Unknown Client'}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {!isEditing ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Estimate
                </Button>
              ) : (
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setIsEditing(false)
                      // Reset edited data
                      setEditedItems(estimate?.estimate_line_items || [])
                      setEditedContractMessage(estimate?.contract_message || '')
                    }}
                  >
                    <XIcon className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSaveEstimate}
                    disabled={saving}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {saving ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              )}
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(estimate.status)}`}>
                {estimate.status}
              </span>
            </div>
          </div>
        </header>
        )}

        {/* Estimate Content */}
        <main className="flex-1 p-6">
          <div ref={estimateContentRef} className="max-w-4xl mx-auto space-y-6 bg-white p-6">
            {/* Client Info */}
            <Card>
              <CardHeader>
                <CardTitle>Client Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3">Client Details</h3>
                    <div className="space-y-2 text-sm">
                      <div className="font-medium">{estimate.clients?.name || 'Unknown Client'}</div>
                      {estimate.clients?.email && (
                        <div className="flex items-center text-gray-600">
                          <Mail className="h-4 w-4 mr-2" />
                          {estimate.clients.email}
                        </div>
                      )}
                      {estimate.clients?.phone && (
                        <div className="flex items-center text-gray-600">
                          <Phone className="h-4 w-4 mr-2" />
                          {estimate.clients.phone}
                        </div>
                      )}
                      {estimate.clients?.address && (
                        <div className="flex items-start text-gray-600">
                          <MapPin className="h-4 w-4 mr-2 mt-0.5" />
                          {estimate.clients.address}
                        </div>
                      )}
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3">Estimate Details</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Created:</span>
                        <span>{new Date(estimate.created_at).toLocaleDateString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Updated:</span>
                        <span>{new Date(estimate.updated_at).toLocaleDateString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total:</span>
                        <span className="font-semibold text-lg">{formatCurrencyWithSymbol(estimate.total)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Line Items */}
            {(isEditing ? editedItems : estimate.estimate_line_items) && (isEditing ? editedItems : estimate.estimate_line_items).length > 0 && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Line Items</CardTitle>
                    {isEditing && (
                      <Button variant="outline" size="sm" onClick={addItem}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Item
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Description</th>
                          <th className="px-4 py-3 text-right text-sm font-medium text-gray-900">Quantity</th>
                          <th className="px-4 py-3 text-right text-sm font-medium text-gray-900">Unit</th>
                          <th className="px-4 py-3 text-right text-sm font-medium text-gray-900">Unit Price</th>
                          <th className="px-4 py-3 text-right text-sm font-medium text-gray-900">Total</th>
                          {isEditing && <th className="px-4 py-3 text-center text-sm font-medium text-gray-900">Actions</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {(isEditing ? editedItems : estimate.estimate_line_items).map((item, index) => (
                          <tr key={isEditing ? index : item.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm">
                              {isEditing ? (
                                <Input
                                  value={item.description}
                                  onChange={(e) => updateItem(index, 'description', e.target.value)}
                                  className="min-w-[200px]"
                                  placeholder="Item description"
                                />
                              ) : (
                                <div className="font-medium text-gray-900">{item.description}</div>
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm text-right">
                              {isEditing ? (
                                <Input
                                  type="number"
                                  value={item.quantity}
                                  onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                                  className="w-20 ml-auto text-right"
                                  min="0"
                                  step="0.01"
                                />
                              ) : (
                                <span className="text-gray-600">{item.quantity.toLocaleString()} {item.unit}</span>
                              )}
                            </td>
                            {isEditing && (
                              <td className="px-4 py-3 text-sm text-right">
                                <Input
                                  value={item.unit}
                                  onChange={(e) => updateItem(index, 'unit', e.target.value)}
                                  className="w-20 ml-auto"
                                  placeholder="unit"
                                />
                              </td>
                            )}
                            <td className="px-4 py-3 text-sm text-right whitespace-nowrap">
                              {isEditing ? (
                                <Input
                                  type="number"
                                  value={item.unit_price}
                                  onChange={(e) => updateItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                                  className="w-24 ml-auto text-right"
                                  min="0"
                                  step="0.01"
                                />
                              ) : (
                                <span className="text-gray-600">{formatCurrencyWithSymbol(item.unit_price)}</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm text-right font-medium text-gray-900 whitespace-nowrap">
                              {formatCurrencyWithSymbol(item.total)}
                            </td>
                            {isEditing && (
                              <td className="px-4 py-3 text-center">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeItem(index)}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Totals */}
                  <div className="bg-gray-50 px-4 py-4 mt-4">
                    <div className="flex justify-end">
                      <div className="w-64 space-y-2">
                        {(() => {
                          const subtotal = isEditing 
                            ? editedItems.reduce((sum, item) => sum + item.total, 0)
                            : estimate.subtotal
                          const tax = Math.round(subtotal * 0.13 * 100) / 100
                          const total = subtotal + tax
                          return (
                            <>
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Subtotal:</span>
                                <span className="font-medium">{formatCurrencyWithSymbol(subtotal)}</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Tax (13%):</span>
                                <span className="font-medium">{formatCurrencyWithSymbol(tax)}</span>
                              </div>
                              <div className="flex justify-between text-lg font-semibold border-t border-gray-300 pt-2">
                                <span>Total:</span>
                                <span className="text-blue-600">{formatCurrencyWithSymbol(total)}</span>
                              </div>
                            </>
                          )
                        })()}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
            
            {isEditing && editedItems.length === 0 && (
              <Card>
                <CardContent className="p-6 text-center">
                  <p className="text-gray-600 mb-4">No line items yet. Add your first item.</p>
                  <Button onClick={addItem}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add First Item
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Contract Message */}
            {(isEditing || estimate.contract_message) && (
              <Card>
                <CardHeader>
                  <CardTitle>Contract Terms & Conditions</CardTitle>
                </CardHeader>
                <CardContent>
                  {isEditing ? (
                    <div>
                      <Label htmlFor="contract-message">Contract Message</Label>
                      <Textarea
                        id="contract-message"
                        value={editedContractMessage}
                        onChange={(e) => setEditedContractMessage(e.target.value)}
                        className="mt-2 min-h-[200px]"
                        placeholder="Enter contract terms and conditions..."
                      />
                    </div>
                  ) : (
                    <div className="prose max-w-none">
                      <p className="text-gray-700 whitespace-pre-wrap">{estimate.contract_message || 'No contract terms specified.'}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Linked Jobs */}
            {linkedJobs.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Calendar className="h-5 w-5 mr-2" />
                    Linked Jobs
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {linkedJobs.map((job) => (
                      <div key={job.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <div className="font-medium text-gray-900">{job.title}</div>
                          <div className="text-sm text-gray-600">
                            {new Date(job.start_time).toLocaleDateString()} - {new Date(job.end_time).toLocaleDateString()}
                          </div>
                          <span className={`inline-block mt-1 px-2 py-0.5 rounded text-xs font-medium ${
                            job.status === 'Completed' ? 'bg-green-100 text-green-800' :
                            job.status === 'In Progress' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {job.status}
                          </span>
                        </div>
                        <Link href={`/jobs/${job.id}`}>
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4 mr-2" />
                            View Job
                          </Button>
                        </Link>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Action Buttons */}
            <Card>
              <CardHeader>
                <CardTitle>Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-3">
                  <Button 
                    variant="outline" 
                    disabled={updating || isEditing || generatingPDF}
                    onClick={handleDownloadPDF}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    {generatingPDF ? 'Generating PDF...' : 'Download PDF'}
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    onClick={sendEstimateEmail}
                    disabled={updating || sendingEmail || isEditing || !estimate?.clients?.email}
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    {sendingEmail ? 'Sending...' : 'Email to Client'}
                  </Button>
                  
                  {isEditing && (
                    <>
                      <Button
                        onClick={async () => {
                          const saved = await handleSaveEstimate()
                          if (saved) {
                            setIsEditing(false)
                            alert('Estimate saved successfully!')
                          }
                        }}
                        disabled={saving}
                        variant="outline"
                      >
                        <Save className="h-4 w-4 mr-2" />
                        {saving ? 'Saving...' : 'Save Changes'}
                      </Button>
                      <Button
                        onClick={handleSaveAndSend}
                        disabled={saving || sendingEmail || !estimate?.clients?.email}
                      >
                        <Mail className="h-4 w-4 mr-2" />
                        {saving ? 'Saving...' : sendingEmail ? 'Sending...' : 'Save & Send'}
                      </Button>
                    </>
                  )}

                  <Link href={`/invoices/new?estimateId=${estimate.id}&clientId=${estimate.client_id}`}>
                    <Button disabled={updating}>
                      <DollarSign className="h-4 w-4 mr-2" />
                      Create Invoice
                    </Button>
                  </Link>

                  {estimate.status === 'Sent' && (
                    <Button 
                      onClick={() => updateEstimateStatus('Approved')}
                      disabled={updating}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Check className="h-4 w-4 mr-2" />
                      Mark as Approved
                    </Button>
                  )}

                  {(estimate.status === 'Approved' || estimate.status === 'Scheduled') && linkedJobs.length === 0 && (
                    <Button 
                      onClick={() => setShowCreateJobModal(true)}
                      disabled={updating}
                      className="bg-purple-600 hover:bg-purple-700"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Create Job from Estimate
                    </Button>
                  )}
                  
                  {linkedJobs.length > 0 && (
                    <Link href={`/jobs/${linkedJobs[0].id}`}>
                      <Button variant="outline" disabled={updating}>
                        <Eye className="h-4 w-4 mr-2" />
                        View Linked Job
                      </Button>
                    </Link>
                  )}

                  {estimate.status === 'Scheduled' && (
                    <Button 
                      onClick={() => updateEstimateStatus('Completed')}
                      disabled={updating}
                      className="bg-emerald-600 hover:bg-emerald-700"
                    >
                      <Clock className="h-4 w-4 mr-2" />
                      Mark Complete
                    </Button>
                  )}

                  {estimate.status === 'Sent' && (
                    <Button 
                      onClick={() => updateEstimateStatus('Rejected')}
                      disabled={updating}
                      variant="destructive"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Mark as Rejected
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>

      {/* Create Job Modal */}
      {!isPrintMode && (
      <JobCreationModal
        isOpen={showCreateJobModal}
        onClose={() => setShowCreateJobModal(false)}
        onJobCreated={(job) => {
          setShowCreateJobModal(false);
          // Update estimate status to Scheduled if it's Approved
          if (estimate?.status === 'Approved') {
            updateEstimateStatus('Scheduled');
          }
          // Navigate to the new job
          router.push(`/jobs/${job.id}`);
        }}
        estimate={estimate ? {
          id: estimate.id,
          client_id: estimate.client_id,
          description: estimate.estimate_line_items?.map(item => item.description).join(', ') || estimate.clients?.name || 'Job from Estimate'
        } : null}
      />
      )}
    </div>
  )
}

export default function EstimateDetailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading estimate...</p>
        </div>
      </div>
    }>
      <EstimateDetailContent />
    </Suspense>
  )
}
