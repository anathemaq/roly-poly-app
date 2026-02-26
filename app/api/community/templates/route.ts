import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

// GET: Fetch all shared templates with author info
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  
  const { searchParams } = new URL(request.url)
  const sortBy = searchParams.get('sort') || 'likes' // likes, newest, downloads
  const limit = parseInt(searchParams.get('limit') || '50')
  const offset = parseInt(searchParams.get('offset') || '0')

  let query = supabase
    .from('shared_templates')
    .select(`
      id,
      user_id,
      name,
      description,
      activities,
      likes_count,
      downloads_count,
      created_at,
      updated_at,
      author:profiles!shared_templates_user_id_fkey (
        nickname,
        avatar_url
      )
    `)
    .range(offset, offset + limit - 1)

  // Apply sorting
  switch (sortBy) {
    case 'newest':
      query = query.order('created_at', { ascending: false })
      break
    case 'downloads':
      query = query.order('downloads_count', { ascending: false })
      break
    case 'likes':
    default:
      query = query.order('likes_count', { ascending: false })
      break
  }

  const { data, error } = await query

  console.log("[v0] GET /api/community/templates - data:", data?.length, "error:", error?.message)

  if (error) {
    console.log("[v0] GET /api/community/templates error details:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data || [])
}

// POST: Create a new shared template
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { name, description, activities } = body

  if (!name || !activities) {
    return NextResponse.json({ error: 'Name and activities are required' }, { status: 400 })
  }

  console.log("[v0] POST /api/community/templates - user:", user.id, "name:", name)

  const { data, error } = await supabase
    .from('shared_templates')
    .insert({
      user_id: user.id,
      name,
      description: description || null,
      activities
    })
    .select()
    .single()

  console.log("[v0] POST /api/community/templates - result:", data?.id, "error:", error?.message)

  if (error) {
    console.log("[v0] POST error details:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}
