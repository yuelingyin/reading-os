'use server'

import { getAIRecommendation } from '@/lib/ai-preread'
import { createClient, getUser } from '@/lib/supabase/server'

export async function analyzeBookForUser(
  bookTitle: string,
  author?: string,
  userGoal?: string
) {
  return getAIRecommendation(bookTitle, author, userGoal)
}

export async function abandonBook(bookId: string, reason?: string) {
  const user = await getUser()
  if (!user) return { success: false, error: 'Unauthorized' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('books')
    .update({ status: 'abandoned' })
    .eq('id', bookId)
    .eq('user_id', user.id)

  if (error) return { success: false, error: error.message }
  return { success: true }
}