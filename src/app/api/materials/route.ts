import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const isActive = searchParams.get('is_active')

    let query = supabase
      .from('materials')
      .select('*')
      .eq('user_id', user.id)
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
    console.error('Error in GET /api/materials:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { name, description, category, unit, default_price, is_active, image_url } = body

    if (!name || name.trim() === '') {
      return NextResponse.json({ error: 'Material name is required' }, { status: 400 })
    }

    const { data: material, error } = await supabase
      .from('materials')
      .insert({
        user_id: user.id,
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
    console.error('Error in POST /api/materials:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

