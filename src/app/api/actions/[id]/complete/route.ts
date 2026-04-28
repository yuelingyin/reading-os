import { NextResponse } from 'next/server'
import { createClient, getUser } from '@/lib/supabase/server'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser()
  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  const { id } = await params
  const supabase = await createClient()

  await supabase
    .from('action_items')
    .update({ status: 'completed' })
    .eq('id', id)
    .eq('user_id', user.id)

  return NextResponse.redirect(new URL('/actions', request.url))
}