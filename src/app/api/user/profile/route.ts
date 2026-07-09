import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireUser } from '@/lib/api-auth'
import { userProfileUpdateSchema } from '@/lib/api-schemas'
import { captureApiError } from '@/lib/api-error'
import { parseJsonBody, pickAllowed } from '@/lib/validation'

export async function GET() {
  try {
    const supabase = await createClient()
    const auth = await requireUser(supabase)
    if (!auth.ok) return auth.response
    const { user } = auth

    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (error && error.code !== 'PGRST116') {
      return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 })
    }

    if (!profile) {
      const name = user.user_metadata?.full_name || user.email?.split('@')[0] || 'User'
      const { data: newProfile, error: createError } = await supabase
        .from('user_profiles')
        .insert({ id: user.id, user_id: user.id, full_name: name })
        .select()
        .single()

      if (createError) {
        return NextResponse.json({ error: 'Failed to create profile' }, { status: 500 })
      }

      return NextResponse.json({
        ...newProfile,
        email: user.email,
        created_at: user.created_at,
        last_sign_in_at: user.last_sign_in_at,
      })
    }

    return NextResponse.json({
      ...profile,
      email: user.email,
      created_at: user.created_at,
      last_sign_in_at: user.last_sign_in_at,
    })
  } catch (error) {
    captureApiError(error, { route: 'user/profile/GET' })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()
    const auth = await requireUser(supabase)
    if (!auth.ok) return auth.response
    const { user } = auth

    const parsed = await parseJsonBody(request, userProfileUpdateSchema)
    if (!parsed.ok) return parsed.response

    const profileFields = pickAllowed(parsed.data, [
      'first_name', 'last_name', 'full_name', 'date_of_birth', 'phone',
      'address', 'city', 'state', 'zip_code', 'country',
      'company_name', 'job_title', 'business_type', 'avatar_url',
    ] as const)

    const updates: Record<string, unknown> = {
      ...profileFields,
      updated_at: new Date().toISOString(),
    }

    const { data: existingProfile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single()

    let profile
    if (existingProfile) {
      const { data, error } = await supabase
        .from('user_profiles')
        .update(updates)
        .eq('user_id', user.id)
        .select()
        .single()
      if (error) return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
      profile = data
    } else {
      const { data, error } = await supabase
        .from('user_profiles')
        .insert({ id: user.id, user_id: user.id, ...updates })
        .select()
        .single()
      if (error) return NextResponse.json({ error: 'Failed to create profile' }, { status: 500 })
      profile = data
    }

    return NextResponse.json({
      ...profile,
      email: user.email,
      created_at: user.created_at,
      last_sign_in_at: user.last_sign_in_at,
    })
  } catch (error) {
    captureApiError(error, { route: 'user/profile/PUT' })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
