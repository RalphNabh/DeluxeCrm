import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const body = await request.json()
    const { name, description, category, unit, default_price, is_active, image_url } = body

    // Get current material to check for old image
    const { data: currentMaterial } = await supabase
      .from('materials')
      .select('image_url')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (name !== undefined) updates.name = name.trim()
    if (description !== undefined) updates.description = description?.trim() || null
    if (category !== undefined) updates.category = category?.trim() || null
    if (unit !== undefined) updates.unit = unit
    if (default_price !== undefined) updates.default_price = default_price
    if (is_active !== undefined) updates.is_active = is_active
    if (image_url !== undefined) updates.image_url = image_url || null

    // Delete old image if it's being replaced or removed
    if (currentMaterial?.image_url && (image_url !== currentMaterial.image_url || image_url === null)) {
      try {
        const oldPath = currentMaterial.image_url.split('/materials/')[1]
        if (oldPath) {
          await supabase.storage.from('materials').remove([oldPath])
        }
      } catch (e) {
        console.error('Error deleting old image:', e)
        // Continue even if deletion fails
      }
    }

    const { data: material, error } = await supabase
      .from('materials')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating material:', error)
      return NextResponse.json({ error: 'Failed to update material' }, { status: 500 })
    }

    if (!material) {
      return NextResponse.json({ error: 'Material not found' }, { status: 404 })
    }

    return NextResponse.json(material)
  } catch (error) {
    console.error('Error in PUT /api/materials/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params

    // Get material to delete associated image
    const { data: material } = await supabase
      .from('materials')
      .select('image_url')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    // Delete image from storage if it exists
    if (material?.image_url) {
      try {
        const imagePath = material.image_url.split('/materials/')[1]
        if (imagePath) {
          await supabase.storage.from('materials').remove([imagePath])
        }
      } catch (e) {
        console.error('Error deleting image:', e)
        // Continue even if deletion fails
      }
    }

    const { error } = await supabase
      .from('materials')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      console.error('Error deleting material:', error)
      return NextResponse.json({ error: 'Failed to delete material' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/materials/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

