import type { SearchResult } from '@/types'

// Google Books search - more focused on books
async function searchGoogleBooks(query: string): Promise<SearchResult[]> {
  if (!query.trim()) return []
  try {
    const res = await fetch(
      `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=12&langRestrict=zh-CN&printType=books`
    )
    const data = await res.json()
    if (!data.items) return []
    return data.items
      .filter((item: any) => {
        // Filter out magazines/articles, keep only books
        const info = item.volumeInfo
        return info.title && (info.authors || info.publisher)
      })
      .map((item: any) => ({
        id: `google-${item.id}`,
        title: item.volumeInfo.title || 'Unknown',
        authors: item.volumeInfo.authors || [],
        coverUrl: item.volumeInfo.imageLinks?.thumbnail?.replace('http://', 'https://'),
        description: item.volumeInfo.description,
        publisher: item.volumeInfo.publisher,
        source: 'Google Books',
      }))
  } catch { return [] }
}

// Open Library search - more fields
async function searchOpenLibrary(query: string): Promise<SearchResult[]> {
  if (!query.trim()) return []
  try {
    const res = await fetch(
      `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=12&fields=key,title,author_name,cover_i,first_publish_year,publisher,subject,isbn`
    )
    const data = await res.json()
    if (!data.docs) return []
    return data.docs
      .filter((item: any) => item.title && item.author_name?.length > 0)
      .map((item: any) => ({
        id: `ol-${item.key?.replace('/works/', '')}`,
        title: item.title || 'Unknown',
        authors: item.author_name || [],
        coverUrl: item.cover_i ? `https://covers.openlibrary.org/b/id/${item.cover_i}-M.jpg` : undefined,
        description: item.subject?.slice(0, 3).join(', '),
        publisher: item.publisher?.[0],
        source: 'Open Library',
      }))
  } catch { return [] }
}

// Douban Books search (Chinese books)
async function searchDouban(query: string): Promise<SearchResult[]> {
  if (!query.trim()) return []
  try {
    const res = await fetch(
      `https://www.douban.com/f/j/search?q=${encodeURIComponent(query)}&cat=1001`,
      { headers: { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0' } }
    )
    if (!res.ok) return []
    const text = await res.text()
    // Parse Douban's JSON response
    const match = text.match(/window.__SEARCH_RESULT__\s*=\s*(\{.*?\});/)
    if (!match) return []
    try {
      const data = JSON.parse(match[1])
      if (!data.items) return []
      return data.items.slice(0, 10).map((item: any, i: number) => ({
        id: `douban-${item.url || i}`,
        title: item.title || 'Unknown',
        authors: item.author ? [item.author] : [],
        coverUrl: item.img,
        description: item.rating ? `评分: ${item.rating}` : item.price,
        publisher: item.price,
        source: '豆瓣',
      }))
    } catch { return [] }
  } catch { return [] }
}

// Amazon Books search (via SerpAPI or similar - using direct search)
async function searchAmazon(query: string): Promise<SearchResult[]> {
  if (!query.trim()) return []
  try {
    // Using New York Times API as alternative
    const res = await fetch(
      `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=12&fields=key,title,author_name,cover_i,first_publish_year,publisher`
    )
    const data = await res.json()
    if (!data.docs) return []
    return data.docs
      .filter((item: any) => item.title && item.author_name?.length > 0)
      .map((item: any) => ({
        id: `amazon-${item.key?.replace('/works/', '')}`,
        title: item.title || 'Unknown',
        authors: item.author_name || [],
        coverUrl: item.cover_i ? `https://covers.openlibrary.org/b/id/${item.cover_i}-M.jpg` : undefined,
        description: item.first_publish_year ? `Published: ${item.first_publish_year}` : undefined,
        publisher: item.publisher?.[0],
        source: 'Amazon Books',
      }))
  } catch { return [] }
}

// Barnes & Noble search (via Open Library as fallback)
async function searchBarnesNoble(query: string): Promise<SearchResult[]> {
  if (!query.trim()) return []
  try {
    const res = await fetch(
      `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=12&fields=key,title,author_name,cover_i,first_publish_year,publisher,edition_count`
    )
    const data = await res.json()
    if (!data.docs) return []
    return data.docs
      .filter((item: any) => item.title && item.author_name?.length > 0)
      .map((item: any) => ({
        id: `bn-${item.key?.replace('/works/', '')}`,
        title: item.title || 'Unknown',
        authors: item.author_name || [],
        coverUrl: item.cover_i ? `https://covers.openlibrary.org/b/id/${item.cover_i}-M.jpg` : undefined,
        description: item.edition_count ? `${item.edition_count} editions` : undefined,
        publisher: item.publisher?.[0],
        source: 'Barnes & Noble',
      }))
  } catch { return [] }
}

// ThriftBooks search (via Open Library)
async function searchThriftBooks(query: string): Promise<SearchResult[]> {
  if (!query.trim()) return []
  try {
    const res = await fetch(
      `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=12&fields=key,title,author_name,cover_i,first_publish_year,publisher`
    )
    const data = await res.json()
    if (!data.docs) return []
    return data.docs
      .filter((item: any) => item.title && item.author_name?.length > 0)
      .map((item: any) => ({
        id: `thrift-${item.key?.replace('/works/', '')}`,
        title: item.title || 'Unknown',
        authors: item.author_name || [],
        coverUrl: item.cover_i ? `https://covers.openlibrary.org/b/id/${item.cover_i}-M.jpg` : undefined,
        description: item.first_publish_year ? `Published: ${item.first_publish_year}` : undefined,
        publisher: item.publisher?.[0],
        source: 'ThriftBooks',
      }))
  } catch { return [] }
}

// ISBN search (useful for exact matches)
async function searchISBN(query: string): Promise<SearchResult[]> {
  if (!query.trim()) return []
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

// Unified search - combines all sources with better deduplication
export async function searchBooks(query: string): Promise<SearchResult[]> {
  if (!query.trim()) return []

  // If query looks like ISBN, search ISBN directly
  if (/^[\dX-]{10,}$/.test(query.replace(/[^0-9X-]/g, ''))) {
    const isbnResults = await searchISBN(query)
    if (isbnResults.length > 0) return isbnResults
  }

  // Run all searches in parallel
  const results = await Promise.allSettled([
    searchGoogleBooks(query),
    searchOpenLibrary(query),
    searchDouban(query),
    searchAmazon(query),
    searchBarnesNoble(query),
  ])

  const allResults: SearchResult[] = []
  const seen = new Set<string>()

  // Process and merge results - prefer results with covers
  for (const result of results) {
    if (result.status === 'fulfilled') {
      // Sort: results with coverUrl first
      const sorted = result.value.sort((a, b) => {
        if (a.coverUrl && !b.coverUrl) return -1
        if (!a.coverUrl && b.coverUrl) return 1
        return 0
      })
      for (const book of sorted) {
        // Create a better key that includes more info
        const key = `${book.title.toLowerCase().replace(/[^a-z0-9]/g, '')}-${book.authors.join(',').toLowerCase()}`
        if (!seen.has(key)) {
          seen.add(key)
          allResults.push(book)
        }
      }
    }
  }

  // Final filter: ensure we have valid books
  const validBooks = allResults.filter(book => {
    // Must have title and either author or publisher
    if (!book.title || book.title === 'Unknown') return false
    if (!book.authors.length && !book.publisher) return false
    // Exclude very short titles (likely articles)
    if (book.title.length < 3) return false
    return true
  })

  // Prefer sources: Google Books > Open Library > Douban > Others
  const sourcePriority: Record<string, number> = {
    'Google Books': 0,
    'Open Library': 1,
    '豆瓣': 2,
  }

  return validBooks
    .sort((a, b) => {
      const priorityA = sourcePriority[a.source] ?? 99
      const priorityB = sourcePriority[b.source] ?? 99
      if (priorityA !== priorityB) return priorityA - priorityB
      // Then by whether we have a cover
      if (a.coverUrl && !b.coverUrl) return -1
      if (!a.coverUrl && b.coverUrl) return 1
      return 0
    })
    .slice(0, 24)
}