import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      console.error('Auth error:', authError)
      return NextResponse.json({ 
        error: 'Unauthorized',
        details: authError?.message || 'User not authenticated'
      }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ 
        error: 'No file provided or invalid file format',
        received: file ? typeof file : 'null'
      }, { status: 400 })
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'File must be an image' }, { status: 400 })
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'File size must be less than 5MB' }, { status: 400 })
    }

    // Generate unique filename
    const fileExt = file.name.split('.').pop() || 'jpg'
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
    const filePath = `${user.id}/${fileName}`  // Store in user's folder within materials bucket

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('materials')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (uploadError) {
      console.error('Error uploading file:', uploadError)
      
      // Check for specific error types
      if (uploadError.message?.includes('Bucket not found') || uploadError.message?.includes('does not exist')) {
        return NextResponse.json({ 
          error: 'Storage bucket "materials" does not exist. Please create it in Supabase Dashboard > Storage.',
          details: uploadError.message
        }, { status: 500 })
      }
      
      if (uploadError.message?.includes('new row violates row-level security')) {
        return NextResponse.json({ 
          error: 'Permission denied. Please check Storage bucket policies in Supabase.',
          details: uploadError.message
        }, { status: 403 })
      }
      
      return NextResponse.json({ 
        error: uploadError.message || 'Failed to upload image',
        details: uploadError
      }, { status: 500 })
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('materials')
      .getPublicUrl(filePath)

    if (!urlData?.publicUrl) {
      return NextResponse.json({ 
        error: 'Failed to generate public URL for uploaded image'
      }, { status: 500 })
    }

    return NextResponse.json({ 
      url: urlData.publicUrl,
      path: filePath
    }, { status: 200 })
  } catch (error) {
    console.error('Error in POST /api/materials/upload:', error)
    const errorMessage = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ 
      error: errorMessage,
      details: error instanceof Error ? error.stack : String(error)
    }, { status: 500 })
  }
}

