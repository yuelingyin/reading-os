'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@/lib/supabase/client'
import type { Book } from '@/types'

interface ParsedChapter {
  chapterNumber: number
  chapterTitle: string
  content: string
}

interface ParseResult {
  success: boolean
  totalChapters: number
  error?: string
}

// Simple EPUB parser - extracts text content from EPUB files
async function parseEpub(buffer: Buffer): Promise<ParsedChapter[]> {
  // Dynamic import to handle compression
  const AdmZip = (await import('adm-zip')).default
  const zip = new AdmZip(buffer)

  const entries = zip.getEntries()

  // Find HTML/XHTML files
  const htmlFiles = entries
    .filter(entry => {
      const path = entry.entryName.toLowerCase()
      return (path.endsWith('.html') || path.endsWith('.xhtml') || path.endsWith('.xht'))
        && !path.includes('toc') && !path.includes('nav')
    })
    .sort((a, b) => a.entryName.localeCompare(b.entryName))

  const chapters: ParsedChapter[] = []

  for (let i = 0; i < htmlFiles.length; i++) {
    const entry = htmlFiles[i]
    const rawContent = entry.getData().toString('utf8')

    // Strip HTML tags but preserve text structure
    let text = rawContent
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/\s+/g, ' ')
      .trim()

    // Skip very short chapters (likely just navigation elements)
    if (text.length < 100) continue

    // Extract title from first h1, h2, or use filename
    let title = `第 ${i + 1} 章`
    const titleMatch = rawContent.match(/<h[12][^>]*>([^<]+)<\/h[12]>/i)
    if (titleMatch) {
      title = titleMatch[1].trim()
    }

    chapters.push({
      chapterNumber: i + 1,
      chapterTitle: title,
      content: text
    })
  }

  return chapters
}

export async function parseEpubAndStore(
  fileBuffer: Buffer,
  bookId: string,
  userId: string
): Promise<ParseResult> {
  try {
    console.log('Starting EPUB parse for book:', bookId)

    // Parse the EPUB
    const chapters = await parseEpub(fileBuffer)

    if (chapters.length === 0) {
      return { success: false, totalChapters: 0, error: '无法解析 EPUB 文件内容' }
    }

    console.log(`Parsed ${chapters.length} chapters`)

    // Store in Supabase
    const supabase = createSupabaseClient()

    // First, clear any existing content for this book
    await supabase.from('book_contents').delete().eq('book_id', bookId)

    // Insert new chapters
    const insertData = chapters.map(ch => ({
      book_id: bookId,
      chapter_number: ch.chapterNumber,
      chapter_title: ch.chapterTitle,
      content: ch.content,
      user_id: userId
    }))

    const { error: insertError } = await supabase
      .from('book_contents')
      .insert(insertData)

    if (insertError) {
      console.error('Insert error:', insertError)
      return { success: false, totalChapters: 0, error: insertError.message }
    }

    // Update books table
    const { error: updateError } = await supabase
      .from('books')
      .update({
        has_source_file: true,
        total_chapters: chapters.length
      })
      .eq('id', bookId)

    if (updateError) {
      console.error('Update error:', updateError)
      return { success: false, totalChapters: 0, error: updateError.message }
    }

    return { success: true, totalChapters: chapters.length }
  } catch (err: any) {
    console.error('Parse error:', err)
    return { success: false, totalChapters: 0, error: err.message }
  }
}

// Get chapter content for AI gatekeeper
export async function getChapterContent(
  bookId: string,
  chapterNumber: number
): Promise<string | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const { data } = await supabase
    .from('book_contents')
    .select('content')
    .eq('book_id', bookId)
    .eq('chapter_number', chapterNumber)
    .eq('user_id', user.id)
    .single()

  return data?.content || null
}