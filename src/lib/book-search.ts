import type { SearchResult } from '@/types'

// Google Books search
async function searchGoogleBooks(query: string): Promise<SearchResult[]> {
  if (!query.trim()) return []
  try {
    const queries = [
      query,
      `${query} book`,
    ]

    const results: SearchResult[] = []
    for (const q of queries.slice(0, 1)) {
      const res = await fetch(
        `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}&maxResults=12&langRestrict=zh-CN&printType=books`
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

// Open Library search
async function searchOpenLibrary(query: string): Promise<SearchResult[]> {
  if (!query.trim()) return []
  try {
    const endpoints = [
      `https://openlibrary.org/search.json?title=${encodeURIComponent(query)}&limit=12&fields=key,title,author_name,cover_i,first_publish_year,publisher`,
      `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=12&fields=key,title,author_name,cover_i,first_publish_year,publisher`,
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

// Douban search (Chinese books) - via web scraping
async function searchDouban(query: string): Promise<SearchResult[]> {
  if (!query.trim()) return []
  try {
    // Use Douban's search API
    const res = await fetch(
      `https://www.douban.com/f/j/search?q=${encodeURIComponent(query)}&cat=1001`,
      {
        headers: {
          'Accept': 'application/json, text/plain, */*',
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          'Referer': 'https://www.douban.com/',
        },
      }
    )

    if (!res.ok) return []

    const text = await res.text()

    // Douban returns a script with JSON data
    const match = text.match(/window\.__SEARCH_RESULT__\s*=\s*({.+})/)
    if (!match) return []

    try {
      const data = JSON.parse(match[1])
      if (!data.items) return []

      return data.items.slice(0, 12).map((item: any, i: number) => ({
        id: `douban-${item.url || i}`,
        title: item.title,
        authors: item.author ? [item.author] : [],
        coverUrl: item.img,
        description: item.rating ? `评分: ${item.rating}` : item.price,
        publisher: item.price,
        source: '豆瓣',
      }))
    } catch { return [] }
  } catch { return [] }
}

// Dangdang search (Chinese books)
async function searchDangdang(query: string): Promise<SearchResult[]> {
  if (!query.trim()) return []
  try {
    const res = await fetch(
      `https://search.dangdang.com/?key=${encodeURIComponent(query)}&act=search`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        },
      }
    )

    if (!res.ok) return []

    const html = await res.text()

    // Simple parsing - extract book titles and prices
    const bookRegex = /class="name"[^>]*title="([^"]+)"/g
    const priceRegex = /class="price_n"[^>]*>¥([^<]+)</g
    const imgRegex = /data-original="([^"]+)"/g

    const results: SearchResult[] = []
    let match
    let i = 0

    while ((match = bookRegex.exec(html)) !== null && i < 10) {
      const title = match[1]
      priceRegex.lastIndex = match.index
      const priceMatch = priceRegex.exec(html)
      imgRegex.lastIndex = match.index
      const imgMatch = imgRegex.exec(html)

      if (title && title.length > 2) {
        results.push({
          id: `dangdang-${i}`,
          title,
          authors: [],
          coverUrl: imgMatch?.[1]?.replace('http://', 'https://'),
          description: priceMatch ? `¥${priceMatch[1]}` : undefined,
          publisher: undefined,
          source: '当当',
        })
      }
      i++
    }

    return results
  } catch { return [] }
}

// JD.com search (Chinese books)
async function searchJD(query: string): Promise<SearchResult[]> {
  if (!query.trim()) return []
  try {
    const res = await fetch(
      `https://search.jd.com/Search?keyword=${encodeURIComponent(query)}&enc=utf-8&book=y`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          'Referer': 'https://www.jd.com/',
        },
      }
    )

    if (!res.ok) return []

    const html = await res.text()

    // Parse JDs HTML structure
    const skuRegex = /data-sku="(\d+)"/g
    const titleRegex = /class="p-name"[^>]*>.*?<em>([^<]+)<\/em>/g
    const authorRegex = /class="p-bookdetail"[^>]*>([^<]+)<\/span>/g
    const priceRegex = /class="p-price"[^>]*>.*?<i>([^<]+)<\/i>/g

    const results: SearchResult[] = []
    const skus: string[] = []
    const titles: string[] = []
    const authors: string[] = []

    let match
    while ((match = skuRegex.exec(html)) !== null) {
      skus.push(match[1])
    }
    while ((match = titleRegex.exec(html)) !== null) {
      titles.push(match[1].trim())
    }
    while ((match = authorRegex.exec(html)) !== null) {
      authors.push(match[1].trim())
    }

    const count = Math.min(skus.length, titles.length, 10)
    for (let i = 0; i < count; i++) {
      results.push({
        id: `jd-${skus[i]}`,
        title: titles[i],
        authors: authors[i] ? [authors[i]] : [],
        coverUrl: `https://img10.360buyimg.com/n1/${skus[i]}/j_`,
        description: undefined,
        publisher: undefined,
        source: '京东',
      })
    }

    return results
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

// Main search function
export async function searchBooks(query: string): Promise<SearchResult[]> {
  if (!query.trim()) return []

  // If query looks like ISBN, search ISBN directly
  if (/^[\dX-]{10,}$/.test(query.replace(/[^0-9X-]/g, ''))) {
    const isbnResults = await searchISBN(query)
    if (isbnResults.length > 0) return isbnResults
  }

  // Run searches in parallel - Chinese sources first for Chinese queries
  const isChinese = /[\u4e00-\u9fa5]/.test(query)

  let searchFunctions: ((q: string) => Promise<SearchResult[]>)[]

  if (isChinese) {
    searchFunctions = [
      searchDouban,
      searchDangdang,
      searchJD,
      searchGoogleBooks,
      searchOpenLibrary,
    ]
  } else {
    searchFunctions = [
      searchGoogleBooks,
      searchOpenLibrary,
      searchDouban,
      searchDangdang,
      searchJD,
    ]
  }

  const results = await Promise.allSettled(searchFunctions.map(fn => fn(query)))

  const allResults: SearchResult[] = []
  const seen = new Set<string>()

  // Process results
  for (const result of results) {
    if (result.status === 'fulfilled') {
      for (const book of result.value) {
        const key = `${book.title.toLowerCase().trim()}|${(book.authors[0] || '').toLowerCase().trim()}`
        if (!seen.has(key) && book.title.length >= 2) {
          seen.add(key)
          allResults.push(book)
        }
      }
    }
  }

  // Sort: prefer sources based on query language
  const sourcePriorityChinese: Record<string, number> = {
    '豆瓣': 0,
    '当当': 1,
    '京东': 2,
    'Google Books': 3,
    'Open Library': 4,
  }

  const sourcePriorityOther: Record<string, number> = {
    'Google Books': 0,
    'Open Library': 1,
    '豆瓣': 2,
    '当当': 3,
    '京东': 4,
  }

  const priority = isChinese ? sourcePriorityChinese : sourcePriorityOther

  return allResults
    .sort((a, b) => {
      // First: has cover
      if (a.coverUrl && !b.coverUrl) return -1
      if (!a.coverUrl && b.coverUrl) return 1

      // Second: source priority
      const priorityA = priority[a.source] ?? 99
      const priorityB = priority[b.source] ?? 99
      if (priorityA !== priorityB) return priorityA - priorityB

      // Third: title length
      return b.title.length - a.title.length
    })
    .slice(0, 20)
}
