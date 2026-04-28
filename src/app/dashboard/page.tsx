import Link from 'next/link'
import { redirect } from 'next/navigation'
import { BookOpen, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { createClient, getUser } from '@/lib/supabase/server'
import type { Book, BookStatus } from '@/types'

const statusMap: Record<BookStatus, { label: string; className: string }> = {
  'to-read': { label: '待阅读', className: 'bg-gray-100 text-gray-800' },
  'in-progress': { label: '阅读中', className: 'bg-black text-white' },
  completed: { label: '已读完', className: 'bg-gray-400 text-white' },
}

export default async function DashboardPage() {
  const user = await getUser()
  if (!user) redirect('/login')

  const supabase = await createClient()

  const { data: books, isLoading } = await supabase
    .from('books')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <div className="min-h-screen bg-white text-black p-6 md:p-12">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-3">
            <BookOpen className="w-8 h-8" />
            <h1 className="text-2xl font-bold tracking-tight">Reading OS</h1>
          </div>
          <Link href="/books/new">
            <Button className="bg-black text-white hover:bg-gray-800">
              <Plus className="w-4 h-4 mr-2" />
              发起新阅读
            </Button>
          </Link>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex justify-center py-24">
            <p className="text-gray-400">加载中...</p>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && (!books || books.length === 0) && (
          <div className="text-center py-24 border border-dashed border-gray-200 rounded-lg">
            <p className="text-gray-500">当前无阅读计划</p>
            <p className="text-gray-400 text-sm mt-1">去添加一本吧</p>
          </div>
        )}

        {/* Book Grid */}
        {!isLoading && books && books.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {books.map((book: Book) => {
              const status = statusMap[book.status]
              return (
                <Card key={book.id} className="flex flex-col">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h2 className="text-lg font-semibold truncate">
                          {book.title}
                        </h2>
                        {book.author && (
                          <p className="text-sm text-gray-500 mt-0.5">
                            {book.author}
                          </p>
                        )}
                      </div>
                      <Badge className={status.className} variant="secondary">
                        {status.label}
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="flex-1 pb-3">
                    {/* 核心诉求 */}
                    {book.core_questions && book.core_questions.length > 0 && (
                      <div>
                        <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">
                          核心诉求
                        </p>
                        <ul className="space-y-1">
                          {book.core_questions.map((q, i) => (
                            <li key={i} className="text-sm text-gray-700 flex gap-2">
                              <span className="text-gray-400 shrink-0">Q{i + 1}.</span>
                              <span>{q}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* 读书动机 */}
                    {book.reading_motivation && (
                      <>
                        <Separator className="my-3" />
                        <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">
                          读书动机
                        </p>
                        <p className="text-sm text-gray-600 line-clamp-2">
                          {book.reading_motivation}
                        </p>
                      </>
                    )}
                  </CardContent>

                  <CardFooter className="pt-0">
                    <Link href={`/books/${book.id}`} className="w-full">
                      <Button variant="outline" className="w-full">
                        进入复盘
                      </Button>
                    </Link>
                  </CardFooter>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}