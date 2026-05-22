'use client'

import { useState, useEffect, Suspense, useRef } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  ArrowLeft,
  Calendar,
  DollarSign,
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
  Edit,
  Tag,
  Menu,
} from 'lucide-react'
import JobCreationModal from '@/components/jobs/job-creation-modal'
import PageSidebar from '@/components/layout/page-sidebar'
import { formatCurrencyWithSymbol } from '@/lib/utils/currency'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'

interface Estimate {
  id: string;
  client_id: string;
  lead_id?: string;
  status: 'Draft' | 'Sent' | 'Approved' | 'Rejected' | 'Scheduled' | 'Completed';
  subtotal: number;
  tax: number;
  total: number;
  contract_message?: string;
  tags?: string[];
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
  const [sidebarOpen, setSidebarOpen] = useState(false)
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
  const [editedTags, setEditedTags] = useState<string[]>([])
  const [tagsInput, setTagsInput] = useState('')
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
        // Wait for content to fully load and render before downloading
        const checkAndDownload = () => {
          if (estimateContentRef.current && 
              estimateContentRef.current.offsetWidth > 0 && 
              estimateContentRef.current.offsetHeight > 0) {
            handleDownloadPDF()
          } else {
            // Retry after a short delay
            setTimeout(checkAndDownload, 500)
          }
        }
        // Start checking after initial delay
        setTimeout(checkAndDownload, 1000)
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
      // Initialize edited items, contract message, and tags
      setEditedItems(data.estimate_line_items || [])
      setEditedContractMessage(data.contract_message || '')
      setEditedTags(Array.isArray(data.tags) ? data.tags : [])
      setTagsInput(Array.isArray(data.tags) ? data.tags.join(', ') : '')
      
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
            contract_message: editedContractMessage,
            tags: editedTags
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
      setEditedTags(Array.isArray(updated.tags) ? updated.tags : [])
      setTagsInput(Array.isArray(updated.tags) ? updated.tags.join(', ') : '')
      
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
      // Dynamically import libraries to avoid SSR issues
      const [jsPDFModule, html2canvasModule] = await Promise.all([
        import('jspdf'),
        import('html2canvas')
      ])
      
      const jsPDF = jsPDFModule.default || (jsPDFModule as any)
      const html2canvas = html2canvasModule.default || html2canvasModule

      // Ensure element is visible and rendered
      const element = estimateContentRef.current
      if (!element) {
        throw new Error('Element reference is null')
      }

      // Scroll element into view
      element.scrollIntoView({ behavior: 'auto', block: 'start' })
      
      // Wait for scroll to complete
      await new Promise(resolve => setTimeout(resolve, 300))

      // Check element dimensions
      const rect = element.getBoundingClientRect()
      console.log('Element dimensions:', {
        width: rect.width,
        height: rect.height,
        offsetWidth: element.offsetWidth,
        offsetHeight: element.offsetHeight,
        scrollWidth: element.scrollWidth,
        scrollHeight: element.scrollHeight
      })

      // Retry if element is not visible yet
      if (element.offsetWidth === 0 || element.offsetHeight === 0) {
        // Wait and check again
        await new Promise(resolve => setTimeout(resolve, 500))
        if (element.offsetWidth === 0 || element.offsetHeight === 0) {
          throw new Error(`Element is not visible - width: ${element.offsetWidth}, height: ${element.offsetHeight}. Please wait for the page to fully load.`)
        }
      }

      // Wait a bit for any dynamic content to render
      await new Promise(resolve => setTimeout(resolve, 500))

      // Function to convert oklch to rgb (basic conversion)
      const convertOklchToRgb = (oklchStr: string): string => {
        // This is a simple fallback - html2canvas should handle most colors
        // but we'll convert known problematic ones
        if (oklchStr.includes('oklch')) {
          // Extract values from oklch() if possible
          // For now, return a safe fallback color
          return '#ffffff'
        }
        return oklchStr
      }

      // Clone the element and convert oklch colors to rgb for html2canvas compatibility
      const clone = element.cloneNode(true) as HTMLElement
      clone.style.position = 'absolute'
      clone.style.left = '-9999px'
      clone.style.top = '0'
      clone.style.width = `${element.scrollWidth}px`
      clone.style.height = `${element.scrollHeight}px`
      clone.style.backgroundColor = '#ffffff'
      clone.style.color = '#000000'
      
      // Append clone to body temporarily
      document.body.appendChild(clone)

      // Remove buttons and action sections from clone for clean PDF
      
      // Remove the entire "Actions" and "Linked Jobs" card sections
      const allCards = clone.querySelectorAll('[class*="Card"]')
      allCards.forEach((card) => {
        const cardElement = card as HTMLElement
        // Check if this card contains "Actions" or "Linked Jobs" in the header
        const header = cardElement.querySelector('[class*="CardHeader"]')
        const headerText = header?.textContent?.toLowerCase() || ''
        if (headerText.includes('action') || headerText.includes('linked job')) {
          cardElement.remove()
        }
      })

      // Remove all buttons (Download, Edit, Save, etc.)
      const buttons = clone.querySelectorAll('button, [role="button"]')
      buttons.forEach((btn) => {
        btn.remove()
      })

      // Remove links that look like buttons (View, Edit links)
      const buttonLinks = clone.querySelectorAll('a[href]')
      buttonLinks.forEach((link) => {
        const linkElement = link as HTMLElement
        // Check if link contains button-like content (icons, text like "View", "Edit", etc.)
        const linkText = linkElement.textContent?.toLowerCase().trim() || ''
        const buttonKeywords = ['view', 'edit', 'download', 'save', 'send', 'cancel']
        if (buttonKeywords.some(keyword => linkText.includes(keyword))) {
          linkElement.remove()
        }
      })

      // Convert edit mode inputs to plain text for display
      const inputs = clone.querySelectorAll('input[type="text"], input[type="number"], textarea')
      inputs.forEach((input) => {
        const inputElement = input as HTMLElement
        const value = (input as HTMLInputElement).value || (input as HTMLTextAreaElement).value
        const parent = inputElement.parentElement
        if (parent) {
          const textDiv = document.createElement('div')
          textDiv.textContent = value || ''
          textDiv.className = 'text-gray-900'
          textDiv.style.padding = '0.5rem 0'
          parent.replaceChild(textDiv, inputElement)
        }
      })

      // Remove action columns from tables (columns with buttons or "Actions" header)
      const tables = clone.querySelectorAll('table')
      tables.forEach((table) => {
        const rows = table.querySelectorAll('tr')
        rows.forEach((row) => {
          const cells = Array.from(row.querySelectorAll('th, td'))
          cells.forEach((cell) => {
            const cellElement = cell as HTMLElement
            const cellText = cellElement.textContent?.toLowerCase().trim() || ''
            
            // Remove if it's an action column or contains buttons
            if (cellText === 'actions' || cellElement.querySelector('button')) {
              cellElement.remove()
            }
          })
        })
      })

      // Remove any remaining edit/add buttons (like "Add Item" in edit mode)
      const addButtons = clone.querySelectorAll('[class*="Button"], button')
      addButtons.forEach((btn) => {
        const btnText = btn.textContent?.toLowerCase() || ''
        if (btnText.includes('add') || btnText.includes('remove') || btnText.includes('delete')) {
          btn.remove()
        }
      })

      // Convert oklch colors in computed styles
      const allElements = clone.querySelectorAll('*')
      allElements.forEach((el) => {
        const htmlEl = el as HTMLElement
        const computedStyle = window.getComputedStyle(htmlEl)
        
        // Convert background colors
        const bgColor = computedStyle.backgroundColor
        if (bgColor.includes('oklch') || bgColor === 'rgba(0, 0, 0, 0)') {
          htmlEl.style.backgroundColor = '#ffffff'
        }
        
        // Convert text colors
        const textColor = computedStyle.color
        if (textColor.includes('oklch')) {
          htmlEl.style.color = '#000000'
        }
        
        // Convert border colors
        const borderColor = computedStyle.borderColor
        if (borderColor.includes('oklch')) {
          htmlEl.style.borderColor = '#e5e7eb'
        }
      })

      // Temporarily ensure element is in viewport and visible
      const originalStyle = {
        position: element.style.position,
        visibility: element.style.visibility,
        opacity: element.style.opacity,
        display: element.style.display
      }
      
      // Make sure original element is visible for fallback
      element.style.position = 'relative'
      element.style.visibility = 'visible'
      element.style.opacity = '1'
      element.style.display = 'block'

      // Capture the cloned element as canvas (better compatibility)
      let canvas
      try {
        // Wait for clone to render
        await new Promise(resolve => setTimeout(resolve, 300))
        
        canvas = await html2canvas(clone, {
          // @ts-expect-error html2canvas types omit scale
          scale: 1.5,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff',
          allowTaint: false,
          removeContainer: true,
          imageTimeout: 15000,
          foreignObjectRendering: false
        }).catch(() => {
          // If clone fails, try original element
          return html2canvas(element, {
            // @ts-expect-error html2canvas types omit scale
          scale: 1.5,
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff',
            allowTaint: false,
            removeContainer: false,
            imageTimeout: 15000
          })
        })
      } catch (canvasError: any) {
        console.error('html2canvas detailed error:', canvasError)
        const errorMsg = canvasError?.message || 'Unknown error'
        throw new Error(`Failed to capture estimate content: ${errorMsg}`)
      } finally {
        // Remove clone
        if (document.body.contains(clone)) {
          document.body.removeChild(clone)
        }
        // Restore original styles
        element.style.position = originalStyle.position
        element.style.visibility = originalStyle.visibility
        element.style.opacity = originalStyle.opacity
        element.style.display = originalStyle.display
      }

      if (!canvas) {
        throw new Error('Canvas is null after capture')
      }

      console.log('Canvas created successfully:', {
        width: canvas.width,
        height: canvas.height
      })

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
    <div className={`min-h-screen bg-gray-50 flex h-screen ${isPrintMode ? 'print-mode' : ''}`}>
      {/* Sidebar */}
      {!isPrintMode && (
        <div className="flex-shrink-0">
          <PageSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Menu Button */}
        {!isPrintMode && (
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
          </div>
        )}
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
                      setEditedTags(Array.isArray(estimate?.tags) ? estimate.tags : [])
                      setTagsInput(Array.isArray(estimate?.tags) ? estimate.tags.join(', ') : '')
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
          <div 
            ref={estimateContentRef} 
            id="estimate-content-pdf"
            className="max-w-4xl mx-auto space-y-6 bg-white p-6"
            style={{ position: 'relative' }}
          >
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
            {((isEditing ? editedItems : estimate.estimate_line_items)?.length ?? 0) > 0 && (
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
                        {(isEditing ? editedItems ?? [] : estimate.estimate_line_items ?? []).map((item, index) => (
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

            {/* Tags */}
            {(isEditing || (estimate.tags && estimate.tags.length > 0)) && (
              <Card>
                <CardHeader>
                  <CardTitle>Tags</CardTitle>
                </CardHeader>
                <CardContent>
                  {isEditing ? (
                    <div>
                      <Label htmlFor="tags-input">Tags (comma-separated)</Label>
                      <Input
                        id="tags-input"
                        value={tagsInput}
                        onChange={(e) => {
                          setTagsInput(e.target.value)
                          // Parse tags from comma-separated string
                          const tagsArray = e.target.value
                            .split(',')
                            .map(t => t.trim())
                            .filter(t => t.length > 0)
                          setEditedTags(tagsArray)
                        }}
                        className="mt-2"
                        placeholder="e.g., urgent, renovation, kitchen"
                      />
                      {editedTags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-3">
                          {editedTags.map((tag) => (
                            <span
                              key={tag}
                              className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800"
                            >
                              <Tag className="h-3 w-3 mr-1" />
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {estimate.tags && estimate.tags.length > 0 ? (
                        estimate.tags.map((tag) => (
                          <span
                            key={tag}
                            className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800"
                          >
                            <Tag className="h-3 w-3 mr-1" />
                            {tag}
                          </span>
                        ))
                      ) : (
                        <p className="text-gray-500 text-sm">No tags</p>
                      )}
                    </div>
                  )}
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
