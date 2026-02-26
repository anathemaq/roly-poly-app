import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

// POST: Toggle favorite status
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: templateId } = await params
  const supabase = await createClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check if already favorited
  const { data: existing } = await supabase
    .from('template_favorites')
    .select('id')
    .eq('template_id', templateId)
    .eq('user_id', user.id)
    .single()

  if (existing) {
    // Remove favorite
    await supabase
      .from('template_favorites')
      .delete()
      .eq('template_id', templateId)
      .eq('user_id', user.id)
    
    return NextResponse.json({ favorited: false })
  } else {
    // Add favorite
    await supabase
      .from('template_favorites')
      .insert({ template_id: templateId, user_id: user.id })
    
    return NextResponse.json({ favorited: true })
  }
}
