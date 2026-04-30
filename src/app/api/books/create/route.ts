import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { parseEpubAndStore } from '@/lib/actions/epub-parser'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { title, author, coverUrl, readingMode, readingMotivation, coreQuestions, categoryId, epubBase64, epubFileName } = body

    if (!title?.trim()) {
      return NextResponse.json({ error: '标题不能为空' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 })
    }

    const filteredQuestions = (coreQuestions || []).filter((q: string) => q.trim() !== '')

    // Check if has_source_file column exists, include it in insert
    const insertData: Record<string, any> = {
      user_id: user.id,
      title: title.trim(),
      author: author?.trim() || null,
      cover_url: coverUrl || null,
      reading_mode: readingMode || 'skim',
      reading_motivation: readingMotivation?.trim() || null,
      core_questions: filteredQuestions.length > 0 ? filteredQuestions : null,
      category_id: categoryId || null,
      status: 'to-read',
    }

    // Add has_source_file if column exists (for books with EPUB)
    if (epubBase64 && epubFileName) {
      insertData.has_source_file = true
    }

    const { data, error } = await supabase.from('books').insert(insertData).select()

    if (error) {
      console.error('Insert error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // If EPUB file provided, parse and store content
    if (epubBase64 && epubFileName && data?.[0]?.id) {
      const bookId = data[0].id
      try {
        const buffer = Buffer.from(epubBase64, 'base64')
        const parseResult = await parseEpubAndStore(buffer, bookId, user.id)
        if (!parseResult.success) {
          console.error('EPUB parse error:', parseResult.error)
        } else {
          console.log(`EPUB parsed successfully: ${parseResult.totalChapters} chapters`)
        }
      } catch (parseErr) {
        console.error('EPUB parse error:', parseErr)
      }
    }

    return NextResponse.json({ success: true, data })
  } catch (e: any) {
    console.error('Server error:', e)
    return NextResponse.json({ error: e.message || '服务器错误' }, { status: 500 })
  }
}