'use client'

import { Suspense, useState, useEffect, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Search, BookOpen, CheckSquare, FileText } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/lib/supabase/client'
import type { Book, ActionItem } from '@/types'

interface ActionItemWithBook extends ActionItem {
  books?: { title: string } | null
}

function SearchContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const initialQuery = searchParams.get('q') || ''
  const [query, setQuery] = useState(initialQuery)
  const [books, setBooks] = useState<Book[]>([])
  const [actions, setActions] = useState<ActionItemWithBook[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const performSearch = useCallback(async (q: string) => {
    if (!q.trim()) return
    setIsLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const [booksResult, actionsResult] = await Promise.all([
      supabase.from('books').select('*').eq('user_id', user.id)
        .or(`title.ilike.%${q}%,author.ilike.%${q}%`).limit(10),
      supabase.from('action_items').select('*, books(title)').eq('user_id', user.id)
        .ilike('action_description', `%${q}%`).limit(10),
    ])

    setBooks(booksResult.data || [])
    setActions((actionsResult.data || []) as ActionItemWithBook[])
    setIsLoading(false)
  }, [router])

  useEffect(() => {
    if (initialQuery) performSearch(initialQuery)
  }, [initialQuery, performSearch])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    performSearch(query)
    router.push(`/search?q=${encodeURIComponent(query)}`)
  }

  return (
    <div className="min-h-screen bg-white text-black p-6 md:p-12">
      <div className="max-w-3xl mx-auto">
        <form onSubmit={handleSubmit} className="mb-8">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              type="search"
              placeholder="搜索书名、作者、行动..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-12 h-12 text-lg"
              autoFocus
            />
          </div>
        </form>

        {isLoading ? (
          <div className="text-center py-12 text-gray-400">搜索中...</div>
        ) : (
          <>
            {books.length > 0 && (
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-4">
                  <BookOpen className="w-5 h-5 text-gray-400" />
                  <h2 className="text-lg font-semibold">书籍</h2>
                  <Badge variant="secondary">{books.length}</Badge>
                </div>
                <div className="space-y-2">
                  {books.map((book) => (
                    <Link key={book.id} href={`/books/${book.id}`}>
                      <Card className="hover:bg-gray-50 transition-colors">
                        <CardContent className="py-3">
                          <p className="font-medium">{book.title}</p>
                          {book.author && <p className="text-sm text-gray-500">{book.author}</p>}
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {actions.length > 0 && (
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-4">
                  <CheckSquare className="w-5 h-5 text-gray-400" />
                  <h2 className="text-lg font-semibold">行动</h2>
                  <Badge variant="secondary">{actions.length}</Badge>
                </div>
                <div className="space-y-2">
                  {actions.map((action) => (
                    <Link key={action.id} href={`/books/${action.book_id}`}>
                      <Card className="hover:bg-gray-50 transition-colors">
                        <CardContent className="py-3">
                          <p className="font-medium">{action.action_description}</p>
                          {action.books && (
                            <p className="text-sm text-gray-500">来自《{action.books.title}》</p>
                          )}
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {query && books.length === 0 && actions.length === 0 && !isLoading && (
              <div className="text-center py-12 text-gray-400">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>未找到相关结果</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white" />}>
      <SearchContent />
    </Suspense>
  )
}
