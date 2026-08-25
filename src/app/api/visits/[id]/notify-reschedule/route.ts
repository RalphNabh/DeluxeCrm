import { requireOrgMember } from '@/lib/api-auth'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { captureApiError } from '@/lib/api-error'
import { parseJsonBody } from '@/lib/validation'
import { sendVisitRescheduledEmail } from '@/lib/email/visit-reschedule'
import { z } from 'zod'

const notifySchema = z.object({
  new_start: z.string().trim().min(1).max(100),
  new_end: z.string().trim().min(1).max(100),
})

/**
 * POST /api/visits/[id]/notify-reschedule — email the client that this
 * visit moved. Looks up the client's address itself rather than trusting
 * the caller, and takes the new time from the caller since the background
 * PATCH that actually persists the reschedule may not have landed yet.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const auth = await requireOrgMember(supabase)
    if (!auth.ok) return auth.response
    const { orgId } = auth.ctx

    const { id } = await params
    const parsed = await parseJsonBody(request, notifySchema)
    if (!parsed.ok) return parsed.response

    const { data: visit, error } = await supabase
      .from('visits')
      .select(`
        id,
        jobs (
          title,
          clients ( name, email )
        )
      `)
      .eq('id', id)
      .eq('organization_id', orgId)
      .single()

    if (error || !visit) {
      return NextResponse.json({ error: 'Visit not found' }, { status: 404 })
    }

    const job = visit.jobs as { title?: string; clients?: { name?: string; email?: string } | null } | null
    const clientEmail = job?.clients?.email
    if (!clientEmail) {
      return NextResponse.json({ error: 'This client has no email on file' }, { status: 400 })
    }

    const { data: org } = await supabase
      .from('organizations')
      .select('name')
      .eq('id', orgId)
      .single()

    const result = await sendVisitRescheduledEmail({
      clientEmail,
      clientName: job?.clients?.name,
      jobTitle: job?.title || 'Appointment',
      newStart: parsed.data.new_start,
      newEnd: parsed.data.new_end,
      orgName: org?.name,
    })

    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Failed to send email' }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    captureApiError(error, { route: 'visits/[id]/notify-reschedule/POST' })
    return NextResponse.json({ error: 'Failed to notify client' }, { status: 500 })
  }
}
