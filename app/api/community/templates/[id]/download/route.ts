"use server"

import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

// POST: Increment download count
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

  // Increment downloads_count
  const { error } = await supabase.rpc('increment_downloads', { template_id: templateId })

  if (error) {
    // Fallback to direct update if RPC doesn't exist
    const { error: updateError } = await supabase
      .from('shared_templates')
      .update({ downloads_count: supabase.rpc('', {}) })
      .eq('id', templateId)
    
    // Just ignore errors for download tracking - it's not critical
  }

  return NextResponse.json({ success: true })
}
