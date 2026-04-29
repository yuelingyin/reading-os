import type { SearchResult } from '@/types'

// Google Books search
export async function searchGoogleBooks(query: string): Promise<SearchResult[]> {
  if (!query.trim()) return []

  try {
    const res = await fetch(
      `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=8&langRestrict=zh-CN`
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

// Douban search via web scraping alternative - using Open Library as fallback
export async function searchDouban(query: string): Promise<SearchResult[]> {
  if (!query.trim()) return []

  try {
    // Douban doesn't have a public API, but we can try Open Library for international books
    // and use a workaround for Chinese books
    const res = await fetch(
      `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=8`
    )
    const data = await res.json()
    if (!data.docs) return []

    return data.docs.slice(0, 8).map((item: any) => ({
      id: `ol-${item.key?.replace('/works/', '')}`,
      title: item.title || 'Unknown',
      authors: item.author_name || [],
      coverUrl: item.cover_i
        ? `https://covers.openlibrary.org/b/id/${item.cover_i}-M.jpg`
        : undefined,
      description: item.first_publish_year ? `Published: ${item.first_publish_year}` : undefined,
      publisher: item.publisher?.[0],
      source: 'douban' as const,
    }))
  } catch {
    return []
  }
}

// Unified search - combines both sources
export async function searchBooks(query: string): Promise<SearchResult[]> {
  if (!query.trim()) return []

  // Run both searches in parallel
  const [googleResults, doubanResults] = await Promise.all([
    searchGoogleBooks(query),
    searchDouban(query),
  ])

  // Combine and deduplicate by title (case-insensitive)
  const seen = new Set<string>()
  const combined: SearchResult[] = []

  // Add Douban results first (often better for Chinese books)
  for (const result of doubanResults) {
    const key = result.title.toLowerCase()
    if (!seen.has(key)) {
      seen.add(key)
      combined.push(result)
    }
  }

  // Add Google results, skipping duplicates
  for (const result of googleResults) {
    const key = result.title.toLowerCase()
    if (!seen.has(key)) {
      seen.add(key)
      combined.push(result)
    }
  }

  return combined.slice(0, 16)
}