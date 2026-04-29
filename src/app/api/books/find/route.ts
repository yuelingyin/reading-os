import { NextRequest, NextResponse } from 'next/server'
import type { SearchResult } from '@/types'

// Google Books search
async function searchGoogleBooks(query: string): Promise<SearchResult[]> {
  if (!query.trim()) return []
  try {
    const res = await fetch(
      `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=6&langRestrict=zh-CN&printType=books`
    )
    const data = await res.json()
    if (!data.items) return []
    return data.items
      .filter((item: any) => {
        const info = item.volumeInfo
        return info.title && (info.authors?.length > 0 || info.publisher)
      })
      .map((item: any) => ({
        id: `google-${item.id}`,
        title: item.volumeInfo.title,
        authors: item.volumeInfo.authors || [],
        coverUrl: item.volumeInfo.imageLinks?.thumbnail?.replace('http://', 'https://'),
        description: item.volumeInfo.description?.slice(0, 100),
        publisher: item.volumeInfo.publisher,
        source: 'Google Books',
      }))
  } catch { return [] }
}

// Open Library search - primary for book confirmation
async function searchOpenLibrary(query: string): Promise<SearchResult[]> {
  if (!query.trim()) return []
  try {
    // Try title search first for better precision
    let res = await fetch(
      `https://openlibrary.org/search.json?title=${encodeURIComponent(query)}&limit=8&fields=key,title,author_name,cover_i,first_publish_year,publisher`
    )
    let data = await res.json()

    if (!data.docs || data.docs.length === 0) {
      // Fallback to general search
      res = await fetch(
        `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=8&fields=key,title,author_name,cover_i,first_publish_year,publisher`
      )
      data = await res.json()
    }

    if (!data.docs) return []
    return data.docs
      .filter((item: any) => item.title && item.author_name?.length > 0)
      .slice(0, 6)
      .map((item: any) => ({
        id: `ol-${item.key?.replace('/works/', '')}`,
        title: item.title,
        authors: item.author_name || [],
        coverUrl: item.cover_i ? `https://covers.openlibrary.org/b/id/${item.cover_i}-M.jpg` : undefined,
        description: item.first_publish_year ? `${item.first_publish_year}年出版` : undefined,
        publisher: item.publisher?.[0],
        source: 'Open Library',
      }))
  } catch { return [] }
}

// ISBN search
async function searchISBN(query: string): Promise<SearchResult[]> {
  const isbn = query.replace(/[^0-9X]/gi, '')
  if (isbn.length < 10) return []
  try {
    const res = await fetch(
      `https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`
    )
    const data = await res.json()
    const key = `ISBN:${isbn}`
    if (!data[key]) return []
    const book = data[key]
    return [{
      id: `isbn-${isbn}`,
      title: book.title || 'Unknown',
      authors: book.authors?.map((a: any) => a.name) || [],
      coverUrl: book.cover?.medium?.replace('http://', 'https://'),
      description: book.notes,
      publisher: book.publishers?.[0]?.name,
      source: 'ISBN',
    }]
  } catch { return [] }
}

// Find and confirm book
export async function POST(request: NextRequest) {
  try {
    const { title } = await request.json()

    if (!title?.trim()) {
      return NextResponse.json({ options: [] })
    }

    // If looks like ISBN, search ISBN
    if (/^[\dX-]{10,}$/.test(title.replace(/[^0-9X-]/g, ''))) {
      const results = await searchISBN(title)
      return NextResponse.json({
        options: results.map(r => ({
          title: r.title,
          author: r.authors.join(', '),
          coverUrl: r.coverUrl,
          description: r.description || r.publisher,
        }))
      })
    }

    // Search both sources in parallel
    const [olResults, gbResults] = await Promise.allSettled([
      searchOpenLibrary(title),
      searchGoogleBooks(title),
    ])

    const allResults: SearchResult[] = []
    const seen = new Set<string>()

    // Process Open Library results (higher priority for Chinese)
    if (olResults.status === 'fulfilled') {
      for (const book of olResults.value) {
        const key = `${book.title.toLowerCase()}|${book.authors[0]?.toLowerCase() || ''}`
        if (!seen.has(key)) {
          seen.add(key)
          allResults.push(book)
        }
      }
    }

    // Add Google Books results
    if (gbResults.status === 'fulfilled') {
      for (const book of gbResults.value) {
        const key = `${book.title.toLowerCase()}|${book.authors[0]?.toLowerCase() || ''}`
        if (!seen.has(key)) {
          seen.add(key)
          allResults.push(book)
        }
      }
    }

    // If no results, return the title as-is
    if (allResults.length === 0) {
      return NextResponse.json({
        options: [{
          title: title.trim(),
          author: '',
          coverUrl: '',
          description: '未找到匹配结果，请确认书名或手动输入作者',
        }]
      })
    }

    // Return options
    const options = allResults.slice(0, 5).map(r => ({
      title: r.title,
      author: r.authors.join(', '),
      coverUrl: r.coverUrl || '',
      description: r.description || r.publisher || '',
    }))

    return NextResponse.json({ options })
  } catch (e: any) {
    return NextResponse.json({ error: e.message, options: [] })
  }
}