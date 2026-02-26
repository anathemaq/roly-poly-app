import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

// GET: Get user's favorite template IDs
export async function GET() {
  const supabase = await createClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    return NextResponse.json([])
  }

  const { data, error } = await supabase
    .from('template_favorites')
    .select('template_id')
    .eq('user_id', user.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data?.map(f => f.template_id) || [])
}
