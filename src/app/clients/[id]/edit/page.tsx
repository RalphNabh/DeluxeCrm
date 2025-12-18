'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface ClientFolder {
  id: string
  name: string
  color: string
}

interface ClientForm {
  name: string
  email?: string
  phone?: string
  address?: string
  notes?: string
  tags?: string[]
  folder_id?: string | null
}

export default function EditClientPage() {
  const params = useParams()
  const router = useRouter()
  const [form, setForm] = useState<ClientForm>({ name: '' })
  const [folders, setFolders] = useState<ClientFolder[]>([])
  const [tagsInput, setTagsInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (params.id) {
      loadClient()
      loadFolders()
    }
  }, [params.id])

  const loadFolders = async () => {
    try {
      const res = await fetch('/api/client-folders')
      if (res.ok) {
        const data = await res.json()
        setFolders(data || [])
      }
    } catch (e) {
      console.log('Could not load folders:', e)
    }
  }

  const loadClient = async () => {
    try {
      const res = await fetch(`/api/clients`)
      if (!res.ok) throw new Error('Failed to fetch clients')
      const all = await res.json()
      interface Client {
        id: string;
        [key: string]: unknown;
      }
      const c = all.find((x: Client) => x.id === params.id)
      if (!c) throw new Error('Client not found')
      setForm({ 
        name: c.name || '', 
        email: c.email || '', 
        phone: c.phone || '', 
        address: c.address || '', 
        notes: c.notes || '',
        tags: Array.isArray(c.tags) ? c.tags : [],
        folder_id: c.folder_id || null
      })
      setTagsInput(Array.isArray(c.tags) ? c.tags.join(', ') : '')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load client')
    } finally {
      setLoading(false)
    }
  }

  const update = (key: keyof ClientForm, value: string) => setForm(prev => ({ ...prev, [key]: value }))

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      // Parse tags from comma-separated string
      const tagsArray = tagsInput
        .split(',')
        .map(t => t.trim())
        .filter(t => t.length > 0)

      const res = await fetch(`/api/clients/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          tags: tagsArray
        })
      })
      if (!res.ok) throw new Error('Failed to save client')
      router.push('/clients')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save client')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Edit Client</h1>
          <Link href="/clients">
            <Button variant="outline">Cancel</Button>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Client Details</CardTitle>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="mb-4 text-sm text-red-600">{error}</div>
            )}
            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <label className="block text-sm mb-1">Name</label>
                <Input value={form.name} onChange={(e) => update('name', e.target.value)} required />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm mb-1">Email</label>
                  <Input value={form.email} onChange={(e) => update('email', e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm mb-1">Phone</label>
                  <Input value={form.phone} onChange={(e) => update('phone', e.target.value)} />
                </div>
              </div>
              <div>
                <label className="block text-sm mb-1">Address</label>
                <Input value={form.address} onChange={(e) => update('address', e.target.value)} />
              </div>
              <div>
                <label className="block text-sm mb-1">Notes</label>
                <Textarea value={form.notes} onChange={(e) => update('notes', e.target.value)} />
              </div>

              {folders.length > 0 && (
                <div>
                  <Label className="block text-sm mb-1">Folder</Label>
                  <Select
                    value={form.folder_id || "none"}
                    onValueChange={(value) => update('folder_id', value === "none" ? null : value)}
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
                <Label className="block text-sm mb-1">Tags</Label>
                <Input
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  placeholder="e.g., Residential, High Priority, VIP (comma-separated)"
                />
                <p className="text-xs text-gray-500 mt-1">Separate multiple tags with commas</p>
              </div>

              <div className="pt-2">
                <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}


