import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

// GET: Fetch all shared templates with author info
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  
  const { searchParams } = new URL(request.url)
  const sortBy = searchParams.get('sort') || 'likes' // likes, newest, downloads
  const limit = parseInt(searchParams.get('limit') || '50')
  const offset = parseInt(searchParams.get('offset') || '0')

  // First get templates
  let query = supabase
    .from('shared_templates')
    .select('*')
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

  const { data: templates, error } = await query

  console.log("[v0] GET /api/community/templates - templates:", templates?.length, "error:", error?.message)

  if (error) {
    console.log("[v0] GET /api/community/templates error details:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!templates || templates.length === 0) {
    return NextResponse.json([])
  }

  // Fetch author profiles
  const userIds = [...new Set(templates.map(t => t.user_id))]
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, nickname, avatar_url')
    .in('id', userIds)

  const profilesMap = new Map(profiles?.map(p => [p.id, p]) || [])

  // Combine templates with author info
  const templatesWithAuthors = templates.map(t => ({
    ...t,
    author: profilesMap.get(t.user_id) || { nickname: 'Unknown', avatar_url: null }
  }))

  return NextResponse.json(templatesWithAuthors)
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
