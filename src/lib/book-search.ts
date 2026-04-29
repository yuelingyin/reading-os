import type { SearchResult } from '@/types'

// Google Books search - primary source
async function searchGoogleBooks(query: string): Promise<SearchResult[]> {
  if (!query.trim()) return []
  try {
    // Try different query variations to get more results
    const queries = [
      query,
      `${query} book`,
      `${query} 书籍`,
    ]

    const results: SearchResult[] = []
    for (const q of queries.slice(0, 2)) {
      const res = await fetch(
        `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}&maxResults=10&langRestrict=zh-CN&printType=books`
      )
      const data = await res.json()
      if (data.items) {
        for (const item of data.items) {
          const info = item.volumeInfo
          if (info.title && (info.authors?.length > 0 || info.publisher)) {
            results.push({
              id: `google-${item.id}`,
              title: info.title,
              authors: info.authors || [],
              coverUrl: info.imageLinks?.thumbnail?.replace('http://', 'https://'),
              description: info.description?.slice(0, 200),
              publisher: info.publisher,
              source: 'Google Books',
            })
          }
        }
      }
    }
    return results
  } catch { return [] }
}

// Open Library search - primary source with multiple query types
async function searchOpenLibrary(query: string): Promise<SearchResult[]> {
  if (!query.trim()) return []
  try {
    // Try different search endpoints
    const endpoints = [
      // Title search
      `https://openlibrary.org/search.json?title=${encodeURIComponent(query)}&limit=10&fields=key,title,author_name,cover_i,first_publish_year,publisher`,
      // General search
      `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=10&fields=key,title,author_name,cover_i,first_publish_year,publisher`,
      // Author search
      `https://openlibrary.org/search.json?author=${encodeURIComponent(query)}&limit=10&fields=key,title,author_name,cover_i,first_publish_year,publisher`,
    ]

    const results: SearchResult[] = []
    const seen = new Set<string>()

    for (const url of endpoints.slice(0, 2)) {
      try {
        const res = await fetch(url)
        const data = await res.json()
        if (data.docs) {
          for (const item of data.docs) {
            const title = item.title
            const author = (item.author_name || [])[0] || ''
            const key = `${title}-${author}`.toLowerCase()

            if (!seen.has(key) && title) {
              seen.add(key)
              results.push({
                id: `ol-${item.key?.replace('/works/', '') || item.isbn?.[0]}`,
                title,
                authors: item.author_name || [],
                coverUrl: item.cover_i ? `https://covers.openlibrary.org/b/id/${item.cover_i}-M.jpg` : undefined,
                description: item.first_publish_year ? `Published: ${item.first_publish_year}` : undefined,
                publisher: item.publisher?.[0],
                source: 'Open Library',
              })
            }
          }
        }
      } catch { continue }
    }
    return results
  } catch { return [] }
}

// Bing Books search via Open Library API (more international coverage)
async function searchBingBooks(query: string): Promise<SearchResult[]> {
  if (!query.trim()) return []
  try {
    const res = await fetch(
      `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=15&fields=key,title,author_name,cover_i,first_publish_year,publisher,subject,isbn`
    )
    const data = await res.json()
    if (!data.docs) return []

    return data.docs
      .filter((item: any) => item.title && item.author_name?.length > 0)
      .map((item: any) => ({
        id: `bing-${item.key?.replace('/works/', '')}`,
        title: item.title,
        authors: item.author_name,
        coverUrl: item.cover_i ? `https://covers.openlibrary.org/b/id/${item.cover_i}-M.jpg` : undefined,
        description: item.subject?.slice(0, 3).join(', '),
        publisher: item.publisher?.[0],
        source: 'Bing Books',
      }))
  } catch { return [] }
}

// ISBN search - exact match
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

// Main search function
export async function searchBooks(query: string): Promise<SearchResult[]> {
  if (!query.trim()) return []

  // If query looks like ISBN, search ISBN directly
  if (/^[\dX-]{10,}$/.test(query.replace(/[^0-9X-]/g, ''))) {
    const isbnResults = await searchISBN(query)
    if (isbnResults.length > 0) return isbnResults
  }

  // Run searches in parallel
  const results = await Promise.allSettled([
    searchGoogleBooks(query),
    searchOpenLibrary(query),
    searchBingBooks(query),
  ])

  const allResults: SearchResult[] = []
  const seen = new Set<string>()

  // Process results with better deduplication
  for (const result of results) {
    if (result.status === 'fulfilled') {
      for (const book of result.value) {
        // Create unique key from title + first author
        const key = `${book.title.toLowerCase().trim()}|${(book.authors[0] || '').toLowerCase().trim()}`
        if (!seen.has(key) && book.title.length >= 2) {
          seen.add(key)
          allResults.push(book)
        }
      }
    }
  }

  // Sort: prefer results with covers, then by source priority
  const sourcePriority: Record<string, number> = {
    'Google Books': 0,
    'Open Library': 1,
    'Bing Books': 2,
    'ISBN': 3,
  }

  return allResults
    .sort((a, b) => {
      // First: has cover
      if (a.coverUrl && !b.coverUrl) return -1
      if (!a.coverUrl && b.coverUrl) return 1

      // Second: source priority
      const priorityA = sourcePriority[a.source] ?? 99
      const priorityB = sourcePriority[b.source] ?? 99
      if (priorityA !== priorityB) return priorityA - priorityB

      // Third: title length (longer titles tend to be more specific)
      return b.title.length - a.title.length
    })
    .slice(0, 20)
}
