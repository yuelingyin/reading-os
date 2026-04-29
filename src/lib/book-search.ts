import type { SearchResult } from '@/types'

// Google Books search
async function searchGoogleBooks(query: string): Promise<SearchResult[]> {
  if (!query.trim()) return []
  try {
    const res = await fetch(
      `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=10&langRestrict=zh-CN`
    )
    const data = await res.json()
    if (!data.items) return []
    return data.items.map((item: any) => ({
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

// Open Library search
async function searchOpenLibrary(query: string): Promise<SearchResult[]> {
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
      coverUrl: item.cover_i ? `https://covers.openlibrary.org/b/id/${item.cover_i}-M.jpg` : undefined,
      description: item.first_sentence?.[0] || item.first_publish_year ? `Published: ${item.first_publish_year}` : undefined,
      publisher: item.publisher?.[0],
      source: 'Open Library',
    }))
  } catch { return [] }
}

// Douban search (via web scraping)
async function searchDouban(query: string): Promise<SearchResult[]> {
  if (!query.trim()) return []
  try {
    const res = await fetch(
      `https://www.douban.com/search?cat=1001&q=${encodeURIComponent(query)}`,
      { headers: { 'Accept': 'application/json' } }
    )
    if (!res.ok) return []
    const html = await res.text()
    const titleRegex = /class="title">([^<]+)/g
    const matches: SearchResult[] = []
    let match
    let i = 0
    while ((match = titleRegex.exec(html)) !== null && i < 8) {
      matches.push({
        id: `douban-${i++}`,
        title: match[1],
        authors: [],
        source: '豆瓣',
      })
    }
    return matches
  } catch { return [] }
}

// Goodreads search (via Open Library)
async function searchGoodreads(query: string): Promise<SearchResult[]> {
  if (!query.trim()) return []
  try {
    const res = await fetch(
      `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=10&fields=key,title,author_name,cover_i,first_publish_year,publisher,isbn`
    )
    const data = await res.json()
    if (!data.docs) return []
    return data.docs.map((item: any) => ({
      id: `goodreads-${item.key?.replace('/works/', '')}`,
      title: item.title || 'Unknown',
      authors: item.author_name || [],
      coverUrl: item.cover_i ? `https://covers.openlibrary.org/b/id/${item.cover_i}-M.jpg` : undefined,
      description: item.first_publish_year ? `First published: ${item.first_publish_year}` : undefined,
      publisher: item.publisher?.[0],
      source: 'Goodreads',
    }))
  } catch { return [] }
}

// ISBN search
async function searchISBN(query: string): Promise<SearchResult[]> {
  if (!query.trim()) return []
  try {
    const res = await fetch(
      `https://openlibrary.org/api/books?bibkeys=ISBN:${query}&format=json&jscmd=data`
    )
    const data = await res.json()
    const key = `ISBN:${query}`
    if (!data[key]) return []
    const book = data[key]
    return [{
      id: `isbn-${query}`,
      title: book.title || 'Unknown',
      authors: book.authors?.map((a: any) => a.name) || [],
      coverUrl: book.cover?.medium?.replace('http://', 'https://'),
      description: book.notes,
      publisher: book.publishers?.[0]?.name,
      source: 'ISBN',
    }]
  } catch { return [] }
}

// Unified search - combines all sources
export async function searchBooks(query: string): Promise<SearchResult[]> {
  if (!query.trim()) return []

  // Run all searches in parallel
  const results = await Promise.allSettled([
    searchGoogleBooks(query),
    searchOpenLibrary(query),
    searchDouban(query),
    searchGoodreads(query),
  ])

  const allResults: SearchResult[] = []
  const seen = new Set<string>()

  // Process and merge results
  for (const result of results) {
    if (result.status === 'fulfilled') {
      for (const book of result.value) {
        const key = `${book.title.toLowerCase()}-${book.authors.join(',').toLowerCase()}`
        if (!seen.has(key)) {
          seen.add(key)
          allResults.push(book)
        }
      }
    }
  }

  // Deduplicate by title similarity
  const deduped: SearchResult[] = []
  const titleSeen = new Set<string>()

  for (const book of allResults) {
    const normalizedTitle = book.title.toLowerCase().replace(/[^a-z0-9]/g, '')
    if (!titleSeen.has(normalizedTitle)) {
      titleSeen.add(normalizedTitle)
      deduped.push(book)
    }
  }

  return deduped.slice(0, 24)
}
