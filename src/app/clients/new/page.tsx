'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ArrowLeft, Save } from 'lucide-react'
import { useClientFoldersQuery, useInvalidateQueries } from '@/lib/query/hooks'

interface ClientFolder {
  id: string
  name: string
  color: string
}

type DuplicateMatch = {
  id: string
  name: string
  email: string | null
  phone: string | null
  matchedOn: 'email' | 'name'
}

export default function NewClientPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [folderId, setFolderId] = useState<string | null>(null)
  const [tagsInput, setTagsInput] = useState('')
  const [duplicates, setDuplicates] = useState<DuplicateMatch[]>([])
  const [inviteToHub, setInviteToHub] = useState(false)
  const invalidate = useInvalidateQueries()
  const { data: foldersData } = useClientFoldersQuery()
  const folders = (foldersData ?? []) as ClientFolder[]
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    notes: ''
  })

  const inviteClientToHub = async (clientId: string) => {
    const res = await fetch('/api/portal/invitations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      throw new Error(data.error || 'Client created, but Client Hub invite failed')
    }
    return data as { emailed?: boolean; message?: string; inviteUrl?: string }
  }

  const createClient = async (allowDuplicate: boolean) => {
    if (inviteToHub && !formData.email.trim()) {
      throw new Error('Email is required to invite this client to the Client Hub')
    }

    const tagsArray = tagsInput
      .split(',')
      .map(t => t.trim())
      .filter(t => t.length > 0)

    const response = await fetch('/api/clients', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...formData,
        folder_id: folderId,
        tags: tagsArray,
        allowDuplicate,
      }),
    })

    const payload = await response.json().catch(() => ({}))

    if (response.status === 409 && payload.code === 'possible_duplicate') {
      setDuplicates(Array.isArray(payload.matches) ? payload.matches : [])
      return
    }

    if (!response.ok) {
      throw new Error(payload.error || 'Failed to create client')
    }

    setDuplicates([])
    await invalidate.clients()

    const clientId = payload?.id as string | undefined
    if (inviteToHub && clientId) {
      try {
        await inviteClientToHub(clientId)
        router.push(`/clients/${clientId}?hubInvite=sent`)
      } catch {
        router.push(`/clients/${clientId}?hubInvite=failed`)
      }
      return
    }

    router.push(clientId ? `/clients/${clientId}` : '/clients')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      await createClient(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateAnyway = async () => {
    setLoading(true)
    setError(null)
    try {
      await createClient(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      setDuplicates([])
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const duplicateByEmail = duplicates.some((d) => d.matchedOn === 'email')

  return (
    <>
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/clients">
                <Button variant="outline" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Clients
                </Button>
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">New Client</h1>
            </div>
          </div>
        </header>

        {/* Form Content */}
        <main className="flex-1 p-6">
          <div className="max-w-2xl">
            <Card>
              <CardHeader>
                <CardTitle>Client Information</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  {error && (
                    <div className="rounded-md bg-red-50 p-4">
                      <div className="text-sm text-red-700">{error}</div>
                    </div>
                  )}

                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                      Name *
                    </label>
                    <Input
                      id="name"
                      name="name"
                      type="text"
                      required
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="Enter client name"
                    />
                  </div>

                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                      Email{inviteToHub ? ' *' : ''}
                    </label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      required={inviteToHub}
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="Enter email address"
                    />
                  </div>

                  <div className="rounded-lg border border-teal-100 bg-teal-50/60 p-4">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        className="mt-1 h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                        checked={inviteToHub}
                        onChange={(e) => setInviteToHub(e.target.checked)}
                      />
                      <span>
                        <span className="block text-sm font-medium text-gray-900">
                          Invite to Client Hub
                        </span>
                        <span className="block text-sm text-gray-600 mt-0.5">
                          Email them a link to create a Client Hub login so they can view
                          estimates, pay invoices, and request work.
                        </span>
                      </span>
                    </label>
                  </div>

                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                      Phone
                    </label>
                    <Input
                      id="phone"
                      name="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="Enter phone number"
                    />
                  </div>

                  <div>
                    <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-2">
                      Address
                    </label>
                    <Input
                      id="address"
                      name="address"
                      type="text"
                      value={formData.address}
                      onChange={handleChange}
                      placeholder="Enter address"
                    />
                  </div>

                  <div>
                    <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
                      Notes
                    </label>
                    <textarea
                      id="notes"
                      name="notes"
                      rows={4}
                      value={formData.notes}
                      onChange={handleChange}
                      placeholder="Enter any additional notes"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  {folders.length > 0 && (
                    <div>
                      <Label className="block text-sm font-medium text-gray-700 mb-2">
                        Folder
                      </Label>
                      <Select
                        value={folderId || "none"}
                        onValueChange={(value) => setFolderId(value === "none" ? null : value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a folder" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No Folder</SelectItem>
                          {folders.map((folder) => (
                            <SelectItem key={folder.id} value={folder.id}>
                              <div className="flex items-center space-x-2">
                                <div
                                  className="w-3 h-3 rounded-full"
                                  style={{ backgroundColor: folder.color }}
                                />
                                <span>{folder.name}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div>
                    <Label className="block text-sm font-medium text-gray-700 mb-2">
                      Tags
                    </Label>
                    <Input
                      value={tagsInput}
                      onChange={(e) => setTagsInput(e.target.value)}
                      placeholder="e.g., Residential, High Priority, VIP (comma-separated)"
                    />
                    <p className="text-xs text-gray-500 mt-1">Separate multiple tags with commas</p>
                  </div>

                  <div className="flex items-center space-x-4">
                    <Button
                      type="submit"
                      disabled={loading || !formData.name.trim()}
                    >
                      {loading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          {inviteToHub ? 'Creating & inviting...' : 'Creating...'}
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          {inviteToHub ? 'Create & invite' : 'Create Client'}
                        </>
                      )}
                    </Button>
                    <Link href="/clients">
                      <Button type="button" variant="outline">
                        Cancel
                      </Button>
                    </Link>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </main>

      <Dialog open={duplicates.length > 0} onOpenChange={(open) => { if (!open) setDuplicates([]) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {duplicateByEmail
                ? 'A client with this email already exists'
                : 'A client with this name already exists'}
            </DialogTitle>
            <DialogDescription>
              {duplicateByEmail
                ? 'Opening the existing record avoids splitting jobs and invoices across two clients. Create anyway only if these are truly different people sharing an email.'
                : 'This may be the same person, or two people with the same name. Open the existing record unless you are sure you need a new one.'}
            </DialogDescription>
          </DialogHeader>
          <ul className="space-y-2 max-h-48 overflow-y-auto">
            {duplicates.map((match) => (
              <li key={match.id} className="rounded-md border p-3 text-sm">
                <div className="font-medium text-gray-900">{match.name}</div>
                <div className="text-gray-600">
                  {match.email || 'No email'}
                  {match.phone ? ` · ${match.phone}` : ''}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Matched on {match.matchedOn}
                </div>
              </li>
            ))}
          </ul>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDuplicates([])}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleCreateAnyway}
              disabled={loading}
            >
              Create anyway
            </Button>
            <Button
              type="button"
              onClick={() => router.push(`/clients/${duplicates[0].id}`)}
              disabled={loading || !duplicates[0]}
            >
              Open existing
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
