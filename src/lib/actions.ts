'use server'

import { createClient, getUser } from '@/lib/supabase/server'
import { verifyWithAI } from '@/lib/ai-gatekeeper'
import { revalidatePath } from 'next/cache'

export async function advanceChapter(
  bookId: string,
  userReflection: string
): Promise<{ success: boolean; passed?: boolean; feedback?: string; actionable_advice?: string; error?: string }> {
  const user = await getUser()
  if (!user) return { success: false, error: 'Unauthorized' }

  const supabase = await createClient()

  // Get book info
  const { data: book, error: bookError } = await supabase
    .from('books')
    .select('id, reading_mode, book_genre, current_chapter, title')
    .eq('id', bookId)
    .eq('user_id', user.id)
    .single()

  if (bookError || !book) return { success: false, error: 'Book not found' }

  // If skim mode, just advance
  if (book.reading_mode === 'skim') {
    const newChapter = book.current_chapter + 1
    await supabase.from('books').update({ current_chapter: newChapter }).eq('id', bookId)

    // Create minimal review
    await supabase.from('chapter_reviews').insert({
      user_id: user.id,
      book_id: bookId,
      chapter_number: book.current_chapter,
      chapter_title: null,
      key_points: null,
      answers_core_questions: null,
      reflection: userReflection || '粗读记录',
    })

    revalidatePath(`/books/${bookId}`)
    return { success: true, passed: true }
  }

  // Deep mode: verify with AI
  // Get user's API key
  const { data: profile } = await supabase
    .from('profiles')
    .select('openai_api_key')
    .eq('id', user.id)
    .single()

  if (!profile?.openai_api_key) {
    return { success: false, error: '请先在设置中配置 OpenAI API Key' }
  }

  try {
    const result = await verifyWithAI(
      profile.openai_api_key,
      book.book_genre || 'philosophy',
      book.title,
      book.current_chapter + 1,
      userReflection
    )

    if (result.passed) {
      // Advance chapter
      await supabase.from('books').update({ current_chapter: book.current_chapter + 1 }).eq('id', bookId)

      // Create review
      await supabase.from('chapter_reviews').insert({
        user_id: user.id,
        book_id: bookId,
        chapter_number: book.current_chapter + 1,
        chapter_title: null,
        key_points: null,
        answers_core_questions: true,
        reflection: userReflection,
      })

      revalidatePath(`/books/${bookId}`)
      return { success: true, passed: true, feedback: result.feedback, actionable_advice: result.actionable_advice }
    } else {
      return { success: true, passed: false, feedback: result.feedback, actionable_advice: result.actionable_advice }
    }
  } catch (e: any) {
    return { success: false, error: e.message || 'AI verification failed' }
  }
}