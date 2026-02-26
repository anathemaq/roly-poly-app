import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

// GET: Get author profile with their templates and stats
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: authorId } = await params
  console.log("[v0] Author API - authorId:", authorId)
  const supabase = await createClient()

  // Get author profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, nickname, avatar_url, created_at')
    .eq('id', authorId)
    .single()

  console.log("[v0] Author API - profile:", profile, "error:", profileError?.message)

  if (profileError || !profile) {
    return NextResponse.json({ error: 'Author not found' }, { status: 404 })
  }

  // Get author's templates
  const { data: templates, error: templatesError } = await supabase
    .from('shared_templates')
    .select('id, name, description, activities, likes_count, downloads_count, category, created_at')
    .eq('user_id', authorId)
    .order('likes_count', { ascending: false })

  if (templatesError) {
    return NextResponse.json({ error: templatesError.message }, { status: 500 })
  }

  // Calculate total stats
  const totalLikes = templates?.reduce((sum, t) => sum + (t.likes_count || 0), 0) || 0
  const totalDownloads = templates?.reduce((sum, t) => sum + (t.downloads_count || 0), 0) || 0

  return NextResponse.json({
    profile: {
      ...profile,
      totalLikes,
      totalDownloads,
      templatesCount: templates?.length || 0,
    },
    templates: templates || [],
  })
}
