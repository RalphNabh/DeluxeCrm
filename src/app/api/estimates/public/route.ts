import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { rateLimit, rateLimitHeaders } from '@/lib/rate-limit'
import { parseSearchParams, z } from '@/lib/validation'

const querySchema = z.object({
  estimateId: z.string().uuid({ message: 'estimateId must be a valid UUID' }),
  clientEmail: z.string().email().optional(),
})

// Public endpoint to get contract message for estimate approval page
export async function GET(request: NextRequest) {
  try {
    const limit = await rateLimit(request, 'public-strict')
    if (!limit.success) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again shortly.' },
        { status: 429, headers: rateLimitHeaders(limit) }
      )
    }

    const parsed = parseSearchParams(request.nextUrl.searchParams, querySchema)
    if (!parsed.ok) return parsed.response
    const { estimateId, clientEmail } = parsed.data

    // Use service role client to bypass RLS since clients aren't authenticated
    const supabase = createServiceRoleClient()
    
    // Fetch estimate with contract message (public access, no auth required)
    const { data: estimate, error: estimateError } = await supabase
      .from('estimates')
      .select('contract_message, clients(email)')
      .eq('id', estimateId)
      .single()

    if (estimateError || !estimate) {
      return NextResponse.json({ error: 'Estimate not found' }, { status: 404 })
    }

    // Optionally verify client email matches if provided
    if (clientEmail && estimate.clients?.email && estimate.clients.email !== clientEmail) {
      return NextResponse.json({ error: 'Invalid client email' }, { status: 403 })
    }

    return NextResponse.json({ 
      contract_message: estimate.contract_message || null
    })
  } catch (error) {
    console.error('Error fetching contract message:', error)
    return NextResponse.json({ error: 'Failed to fetch contract message' }, { status: 500 })
  }
}



