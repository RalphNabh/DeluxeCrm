import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireOrgMember } from '@/lib/api-auth'
import { materialCreateSchema } from '@/lib/api-schemas'
import { captureApiError } from '@/lib/api-error'
import { parseJsonBody } from '@/lib/validation'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const auth = await requireOrgMember(supabase)
    if (!auth.ok) return auth.response
    const { user, orgId } = auth.ctx

    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const isActive = searchParams.get('is_active')

    let query = supabase
      .from('materials')
      .select('*')
      .eq('organization_id', orgId)
      .order('category', { ascending: true })
      .order('name', { ascending: true })

    if (category) {
      query = query.eq('category', category)
    }

    if (isActive !== null) {
      query = query.eq('is_active', isActive === 'true')
    } else {
      // Default to active only
      query = query.eq('is_active', true)
    }

    const { data: materials, error } = await query

    if (error) {
      console.error('Error fetching materials:', error)
      return NextResponse.json({ error: 'Failed to fetch materials' }, { status: 500 })
    }

    return NextResponse.json(materials || [])
  } catch (error) {
    captureApiError(error, { route: 'materials/GET' })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const auth = await requireOrgMember(supabase)
    if (!auth.ok) return auth.response
    const { user, orgId } = auth.ctx

    const parsed = await parseJsonBody(request, materialCreateSchema)
    if (!parsed.ok) return parsed.response

    const { name, description, category, unit, default_price, is_active, image_url } =
      parsed.data

    const { data: material, error } = await supabase
      .from('materials')
      .insert({
        user_id: user.id, organization_id: orgId,
        name: name.trim(),
        description: description?.trim() || null,
        category: category?.trim() || null,
        unit: unit || 'unit',
        default_price: default_price || 0,
        is_active: is_active !== undefined ? is_active : true,
        image_url: image_url || null
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating material:', error)
      // Return more detailed error message
      const errorMessage = error.message || 'Failed to create material'
      const errorCode = error.code || 'UNKNOWN'
      
      // Check if table doesn't exist
      if (errorCode === '42P01' || errorMessage.includes('does not exist')) {
        return NextResponse.json({ 
          error: 'Materials table does not exist. Please run the database migration: supabase-materials-schema.sql',
          details: error 
        }, { status: 500 })
      }
      
      return NextResponse.json({ 
        error: `Failed to create material: ${errorMessage}`,
        details: error 
      }, { status: 500 })
    }

    return NextResponse.json(material, { status: 201 })
  } catch (error) {
    captureApiError(error, { route: 'materials/POST' })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

