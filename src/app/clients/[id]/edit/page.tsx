'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

interface ClientForm {
  name: string
  email?: string
  phone?: string
  address?: string
  notes?: string
}

export default function EditClientPage() {
  const params = useParams()
  const router = useRouter()
  const [form, setForm] = useState<ClientForm>({ name: '' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (params.id) {
      loadClient()
    }
  }, [params.id])

  const loadClient = async () => {
    try {
      const res = await fetch(`/api/clients`)
      if (!res.ok) throw new Error('Failed to fetch clients')
      const all = await res.json()
      const c = all.find((x: any) => x.id === params.id)
      if (!c) throw new Error('Client not found')
      setForm({ name: c.name || '', email: c.email || '', phone: c.phone || '', address: c.address || '', notes: c.notes || '' })
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
      const res = await fetch(`/api/clients/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
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


