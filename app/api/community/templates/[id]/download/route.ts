import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

// POST: Download template (increment count and return template data)
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

  // Get template data
  const { data: template, error: fetchError } = await supabase
    .from('shared_templates')
    .select('id, name, description, activities')
    .eq('id', templateId)
    .single()

  if (fetchError || !template) {
    return NextResponse.json({ error: 'Template not found' }, { status: 404 })
  }

  // Increment downloads_count (non-blocking)
  supabase.rpc('increment_downloads', { template_id: templateId }).catch(() => {})

  return NextResponse.json({ 
    success: true,
    template: {
      name: template.name,
      description: template.description,
      activities: template.activities,
    }
  })
}
