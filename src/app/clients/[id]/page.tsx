'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { 
  ArrowLeft,
  FileText,
  DollarSign,
  Mail,
  Phone,
  MapPin,
  Plus,
  Eye
} from 'lucide-react'

interface Client {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  notes?: string;
  total_value?: number;
  created_at: string;
  updated_at: string;
}

interface Estimate {
  id: string;
  client_id: string;
  status: string;
  total: number;
  created_at: string;
}

export default function ClientDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [client, setClient] = useState<Client | null>(null)
  const [estimates, setEstimates] = useState<Estimate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (params.id) {
      load()
    }
  }, [params.id])

  const load = async () => {
    try {
      // fetch clients and find by id (simple reuse of /api/clients)
      const cRes = await fetch('/api/clients')
      if (!cRes.ok) throw new Error('Failed to fetch client')
      const all = await cRes.json()
      const c = all.find((x: any) => x.id === params.id)
      if (!c) throw new Error('Client not found')
      setClient(c)

      // fetch estimates for this client
      const eRes = await fetch(`/api/estimates?client_id=${params.id}`)
      if (eRes.ok) {
        const estimatesData = await eRes.json()
        setEstimates(estimatesData || [])
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load client')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading client...</p>
        </div>
      </div>
    )
  }

  if (error || !client) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Error: {error || 'Client not found'}</p>
          <Link href="/clients">
            <Button>Back to Clients</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/clients">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </Link>
            <h1 className="text-2xl font-bold">{client.name}</h1>
          </div>
          <div className="flex items-center space-x-2">
            <Link href={`/clients/${client.id}/edit`}>
              <Button variant="outline" size="sm">Edit</Button>
            </Link>
            <Link href={`/estimates/new?clientId=${client.id}`}>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                New Estimate
              </Button>
            </Link>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Client Info</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-3">
                {client.email && (
                  <div className="flex items-center text-sm text-gray-700">
                    <Mail className="h-4 w-4 mr-2" />
                    {client.email}
                  </div>
                )}
                {client.phone && (
                  <div className="flex items-center text-sm text-gray-700">
                    <Phone className="h-4 w-4 mr-2" />
                    {client.phone}
                  </div>
                )}
                {client.address && (
                  <div className="flex items-start text-sm text-gray-700">
                    <MapPin className="h-4 w-4 mr-2 mt-0.5" />
                    {client.address}
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <div className="flex items-center">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <DollarSign className="h-5 w-5 text-purple-600" />
                  </div>
                  <div className="ml-3">
                    <div className="text-sm text-gray-600">Client Total Value</div>
                    <div className="text-xl font-semibold">${Number(client.total_value || 0).toLocaleString()}</div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Estimates</CardTitle>
          </CardHeader>
          <CardContent>
            {estimates.length === 0 ? (
              <div className="text-sm text-gray-600">No estimates for this client yet.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {estimates.map((e) => (
                  <div key={e.id} className="border rounded-lg p-4 bg-white flex items-center justify-between">
                    <div>
                      <div className="text-sm text-gray-600">#{e.id.slice(0,8)}</div>
                      <div className="font-medium">${e.total.toLocaleString()}</div>
                      <div className="text-xs text-gray-500">{new Date(e.created_at).toLocaleDateString()} • {e.status}</div>
                    </div>
                    <Link href={`/estimates/${e.id}`}>
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4 mr-2" />
                        View
                      </Button>
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}


