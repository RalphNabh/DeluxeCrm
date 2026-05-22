import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireUser } from '@/lib/api-auth'
import { userProfileUpdateSchema } from '@/lib/api-schemas'
import { captureApiError } from '@/lib/api-error'
import { parseJsonBody, pickAllowed } from '@/lib/validation'

// GET: Fetch user profile
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch user profile
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error fetching profile:', error)
      return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 })
    }

    // If profile doesn't exist, create one with basic info
    if (!profile) {
      const { data: authUser } = await supabase.auth.getUser()
      const name = authUser.user?.user_metadata?.full_name || 
                   authUser.user?.user_metadata?.name ||
                   authUser.user?.email?.split('@')[0] || 'User'
      
      const { data: newProfile, error: createError } = await supabase
        .from('user_profiles')
        .insert({
          id: user.id,
          user_id: user.id,
          full_name: name,
        })
        .select()
        .single()

      if (createError) {
        console.error('Error creating profile:', createError)
        return NextResponse.json({ error: 'Failed to create profile' }, { status: 500 })
      }

      return NextResponse.json({
        ...newProfile,
        email: authUser.user?.email,
        created_at: authUser.user?.created_at,
        last_sign_in_at: authUser.user?.last_sign_in_at
      })
    }

    // Get auth user data
    const { data: authUser } = await supabase.auth.getUser()

    return NextResponse.json({
      ...profile,
      email: authUser.user?.email,
      created_at: authUser.user?.created_at,
      last_sign_in_at: authUser.user?.last_sign_in_at
    })

  } catch (error) {
    console.error('Error in GET /api/user/profile:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT: Update user profile
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()
    const auth = await requireUser(supabase)
    if (!auth.ok) return auth.response
    const user = auth.user

    const parsed = await parseJsonBody(request, userProfileUpdateSchema)
    if (!parsed.ok) return parsed.response

    const profileFields = pickAllowed(parsed.data, [
      'first_name',
      'last_name',
      'full_name',
      'date_of_birth',
      'phone',
      'address',
      'city',
      'state',
      'zip_code',
      'country',
      'company_name',
      'job_title',
      'business_type',
      'avatar_url',
    ] as const)

    const updates: Record<string, unknown> = {
      ...profileFields,
      updated_at: new Date().toISOString(),
    }

    // Update or insert profile
    const { data: existingProfile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single()

    let profile
    if (existingProfile) {
      // Update existing profile
      const { data, error } = await supabase
        .from('user_profiles')
        .update(updates)
        .eq('user_id', user.id)
        .select()
        .single()

      if (error) {
        console.error('Error updating profile:', error)
        return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
      }
      profile = data
    } else {
      // Create new profile
      const { data, error } = await supabase
        .from('user_profiles')
        .insert({
          id: user.id,
          user_id: user.id,
          ...updates
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating profile:', error)
        return NextResponse.json({ error: 'Failed to create profile' }, { status: 500 })
      }
      profile = data
    }

    // Get auth user data
    const { data: authUser } = await supabase.auth.getUser()

    return NextResponse.json({
      ...profile,
      email: authUser.user?.email,
      created_at: authUser.user?.created_at,
      last_sign_in_at: authUser.user?.last_sign_in_at
    })

  } catch (error) {
    captureApiError(error, { route: 'user/profile/PUT' })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


