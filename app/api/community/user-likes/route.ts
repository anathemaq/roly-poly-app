"use server"

import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

// GET: Fetch all template IDs that current user has liked
export async function GET() {
  const supabase = await createClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('template_likes')
    .select('template_id')
    .eq('user_id', user.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const likedIds = data.map(item => item.template_id)
  return NextResponse.json(likedIds)
}
