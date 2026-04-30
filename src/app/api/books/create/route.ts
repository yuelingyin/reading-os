import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { title, author, coverUrl, readingMode, readingMotivation, coreQuestions, categoryId } = await request.json()

    if (!title?.trim()) {
      return NextResponse.json({ error: '标题不能为空' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 })
    }

    const filteredQuestions = (coreQuestions || []).filter((q: string) => q.trim() !== '')

    const { data, error } = await supabase.from('books').insert({
      user_id: user.id,
      title: title.trim(),
      author: author?.trim() || null,
      cover_url: coverUrl || null,
      reading_mode: readingMode || 'skim',
      reading_motivation: readingMotivation?.trim() || null,
      core_questions: filteredQuestions.length > 0 ? filteredQuestions : null,
      category_id: categoryId || null,
      status: 'to-read',
    }).select()

    if (error) {
      console.error('Insert error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (e: any) {
    console.error('Server error:', e)
    return NextResponse.json({ error: e.message || '服务器错误' }, { status: 500 })
  }
}