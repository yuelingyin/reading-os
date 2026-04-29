import type { SearchResult } from '@/types'

// Call our API route which proxies the search requests (avoids CORS)
export async function searchBooks(query: string): Promise<SearchResult[]> {
  if (!query.trim()) return []

  try {
    const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`)
    const data = await res.json()
    return data.results || []
  } catch {
    return []
  }
}
