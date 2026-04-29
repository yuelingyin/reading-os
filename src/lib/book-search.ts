import type { SearchResult } from '@/types'

// Google Books search
export async function searchGoogleBooks(query: string): Promise<SearchResult[]> {
  if (!query.trim()) return []

  try {
    const res = await fetch(
      `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=10&langRestrict=zh-CN`
    )
    const data = await res.json()
    if (!data.items) return []

    return data.items.map((item: any) => ({
      id: item.id,
      title: item.volumeInfo.title || 'Unknown',
      authors: item.volumeInfo.authors || [],
      coverUrl: item.volumeInfo.imageLinks?.thumbnail?.replace('http://', 'https://'),
      description: item.volumeInfo.description,
      publisher: item.volumeInfo.publisher,
      source: 'google' as const,
    }))
  } catch {
    return []
  }
}

// Open Library search
export async function searchOpenLibrary(query: string): Promise<SearchResult[]> {
  if (!query.trim()) return []

  try {
    const res = await fetch(
      `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=10`
    )
    const data = await res.json()
    if (!data.docs) return []

    return data.docs.slice(0, 10).map((item: any) => ({
      id: `ol-${item.key?.replace('/works/', '')}`,
      title: item.title || 'Unknown',
      authors: item.author_name || [],
      coverUrl: item.cover_i
        ? `https://covers.openlibrary.org/b/id/${item.cover_i}-M.jpg`
        : undefined,
      description: item.first_publish_year ? `Published: ${item.first_publish_year}` : undefined,
      publisher: item.publisher?.[0],
      source: 'openlibrary' as const,
    }))
  } catch {
    return []
  }
}

// Douban search via CORS proxy alternative
export async function searchDouban(query: string): Promise<SearchResult[]> {
  if (!query.trim()) return []

  try {
    // Using a CORS proxy or direct search
    const res = await fetch(
      `https://api.douban.com/v2/book/search?q=${encodeURIComponent(query)}&count=10`,
      {
        headers: {
          'Accept': 'application/json',
        },
      }
    )
    if (!res.ok) return []

    const data = await res.json()
    if (!data.books || data.books.length === 0) return []

    return data.books.map((item: any) => ({
      id: `douban-${item.id}`,
      title: item.title || 'Unknown',
      authors: item.author || [],
      coverUrl: item.image?.replace('http://', 'https://'),
      description: item.publisher,
      publisher: item.publisher,
      source: 'douban' as const,
    }))
  } catch {
    return []
  }
}

// Goodreads search via Open Library as fallback
export async function searchGoodreads(query: string): Promise<SearchResult[]> {
  if (!query.trim()) return []

  try {
    // Goodreads doesn't have a public API, so we use Open Library with more aggressive params
    const res = await fetch(
      `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=10&fields=key,title,author_name,cover_i,first_publish_year,publisher`
    )
    const data = await res.json()
    if (!data.docs) return []

    return data.docs.map((item: any) => ({
      id: `gr-${item.key?.replace('/works/', '')}`,
      title: item.title || 'Unknown',
      authors: item.author_name || [],
      coverUrl: item.cover_i
        ? `https://covers.openlibrary.org/b/id/${item.cover_i}-M.jpg`
        : undefined,
      description: item.first_publish_year ? `First published: ${item.first_publish_year}` : undefined,
      publisher: item.publisher?.[0],
      source: 'goodreads' as const,
    }))
  } catch {
    return []
  }
}

// Thirtysixes search
export async function searchThirtysixes(query: string): Promise<SearchResult[]> {
  if (!query.trim()) return []

  try {
    const res = await fetch(
      `https://www.36functions.com/openapi/book/search?keyword=${encodeURIComponent(query)}&pageSize=10`
    )
    if (!res.ok) return []
    const data = await res.json()
    if (!data.data?.items) return []

    return data.data.items.map((item: any) => ({
      id: `36-${item.isbn}`,
      title: item.title || 'Unknown',
      authors: item.authors || [],
      coverUrl: item.coverUrl,
      description: item.description,
      publisher: item.publisher,
      source: 'thirtysixes' as const,
    }))
  } catch {
    return []
  }
}

// Unified search - combines multiple sources
export async function searchBooks(query: string): Promise<SearchResult[]> {
  if (!query.trim()) return []

  // Run all searches in parallel
  const [googleResults, openLibraryResults, doubanResults] = await Promise.allSettled([
    searchGoogleBooks(query),
    searchOpenLibrary(query),
    searchDouban(query),
  ])

  const googleData = googleResults.status === 'fulfilled' ? googleResults.value : []
  const openLibraryData = openLibraryResults.status === 'fulfilled' ? openLibraryResults.value : []
  const doubanData = doubanResults.status === 'fulfilled' ? doubanResults.value : []

  // Combine and deduplicate by title (case-insensitive)
  const seen = new Set<string>()
  const combined: SearchResult[] = []

  // Add Douban results first (often better for Chinese books)
  for (const result of doubanData) {
    const key = result.title.toLowerCase()
    if (!seen.has(key)) {
      seen.add(key)
      combined.push(result)
    }
  }

  // Add Open Library results
  for (const result of openLibraryData) {
    const key = result.title.toLowerCase()
    if (!seen.has(key)) {
      seen.add(key)
      combined.push(result)
    }
  }

  // Add Google results, skipping duplicates
  for (const result of googleData) {
    const key = result.title.toLowerCase()
    if (!seen.has(key)) {
      seen.add(key)
      combined.push(result)
    }
  }

  return combined.slice(0, 20)
}
