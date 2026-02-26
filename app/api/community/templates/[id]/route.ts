import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

// GET: Fetch a single template
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  
  const { data: template, error } = await supabase
    .from('shared_templates')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !template) {
    return NextResponse.json({ error: error?.message || 'Not found' }, { status: 404 })
  }

  // Fetch author profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('nickname, avatar_url')
    .eq('id', template.user_id)
    .single()

  return NextResponse.json({
    ...template,
    author: profile || { nickname: 'Unknown', avatar_url: null }
  })
}

// PATCH: Update a template (only by owner)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { name, description, activities, category } = body

  // Build update object with only provided fields
  const updates: Record<string, unknown> = {}
  if (name !== undefined) updates.name = name
  if (description !== undefined) updates.description = description
  if (activities !== undefined) updates.activities = activities
  if (category !== undefined) updates.category = category

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('shared_templates')
    .update(updates)
    .eq('id', id)
    .eq('user_id', user.id) // Only owner can update
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

// DELETE: Delete a template (only by owner)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { error } = await supabase
    .from('shared_templates')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id) // RLS also enforces this

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
