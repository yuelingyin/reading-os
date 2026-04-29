export interface GoogleBook {
  id: string
  title: string
  authors: string[]
  description?: string
  thumbnail?: string
  publishedDate?: string
}

export async function searchBooks(query: string): Promise<GoogleBook[]> {
  if (!query.trim()) return []

  const res = await fetch(
    `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=8&langRestrict=zh-CN`
  )
  const data = await res.json()

  if (!data.items) return []

  return data.items.map((item: any) => ({
    id: item.id,
    title: item.volumeInfo.title || 'Unknown',
    authors: item.volumeInfo.authors || [],
    description: item.volumeInfo.description,
    thumbnail: item.volumeInfo.imageLinks?.thumbnail?.replace('http://', 'https://'),
    publishedDate: item.volumeInfo.publishedDate,
  }))
}
