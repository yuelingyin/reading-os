import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { BookOpen, Plus, ArrowLeft, CheckCircle, Circle, Flag, CheckSquare, Square, Sparkles, BookText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { createClient, getUser } from '@/lib/supabase/server'
import type { Book, ChapterReview, ActionItem, ExtendedReading, BookStatus } from '@/types'

const statusMap: Record<BookStatus, { label: string; className: string }> = {
  'to-read': { label: '待阅读', className: 'bg-gray-100 text-gray-800' },
  'in-progress': { label: '阅读中', className: 'bg-black text-white' },
  completed: { label: '已读完', className: 'bg-gray-400 text-white' },
}

interface Props {
  params: Promise<{ id: string }>
}

export default async function BookDetailPage({ params }: Props) {
  const user = await getUser()
  if (!user) redirect('/login')

  const { id } = await params
  const supabase = await createClient()

  const { data: book, error: bookError } = await supabase
    .from('books')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (bookError || !book) {
    notFound()
  }

  const { data: reviews } = await supabase
    .from('chapter_reviews')
    .select('*')
    .eq('book_id', id)
    .eq('user_id', user.id)
    .order('chapter_number', { ascending: true })

  const { data: actionItems } = await supabase
    .from('action_items')
    .select('*')
    .eq('book_id', id)
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })

  const { data: extendedReadings } = await supabase
    .from('extended_reading')
    .select('*')
    .eq('book_id', id)
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })

  const status = statusMap[book.status]
  const isCompleted = book.status === 'completed'

  return (
    <div className="min-h-screen bg-white text-black p-6 md:p-12">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center text-sm text-gray-500 hover:text-black mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            返回首页
          </Link>

          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-1">
                <BookOpen className="w-6 h-6 shrink-0" />
                <h1 className="text-2xl font-bold truncate">{book.title}</h1>
              </div>
              {book.author && (
                <p className="text-gray-500 ml-9">{book.author}</p>
              )}
            </div>
            <Badge className={status.className} variant="secondary">
              {status.label}
            </Badge>
          </div>
        </div>

        {/* 核心诉求 */}
        {book.core_questions && book.core_questions.length > 0 && (
          <Card className="mb-6 bg-gray-50 border-gray-200">
            <CardHeader className="pb-3">
              <p className="text-xs text-gray-400 uppercase tracking-wide">
                核心诉求 · 阅读初心
              </p>
            </CardHeader>
            <CardContent className="pt-0">
              <ul className="space-y-1">
                {book.core_questions.map((q, i) => (
                  <li key={i} className="text-sm text-gray-700 flex gap-2">
                    <span className="text-gray-400 shrink-0">Q{i + 1}.</span>
                    <span>{q}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* 读书动机 */}
        {book.reading_motivation && (
          <Card className="mb-6 bg-gray-50 border-gray-200">
            <CardHeader className="pb-3">
              <p className="text-xs text-gray-400 uppercase tracking-wide">
                读书动机
              </p>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-sm text-gray-600">{book.reading_motivation}</p>
            </CardContent>
          </Card>
        )}

        <Separator className="my-6" />

        {/* 复盘时间轴 */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">章节复盘</h2>
            <span className="text-sm text-gray-400">
              {reviews?.length || 0} 章
            </span>
          </div>

          {!reviews || reviews.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-gray-200 rounded-lg">
              <p className="text-gray-400">暂无复盘记录</p>
              <p className="text-gray-300 text-sm mt-1">
                开始阅读后，来这里打卡记录你的思考
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {reviews.map((review: ChapterReview) => (
                <Card key={review.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">
                          第 {review.chapter_number} 章
                        </span>
                        {review.chapter_title && (
                          <>
                            <span className="text-gray-400">·</span>
                            <span className="text-sm text-gray-500">
                              {review.chapter_title}
                            </span>
                          </>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-sm">
                        {review.answers_core_questions ? (
                          <>
                            <CheckCircle className="w-4 h-4 text-green-600" />
                            <span className="text-green-600">已解答</span>
                          </>
                        ) : (
                          <>
                            <Circle className="w-4 h-4 text-gray-300" />
                            <span className="text-gray-400">待解答</span>
                          </>
                        )}
                      </div>
                    </div>
                  </CardHeader>

                  {review.key_points && review.key_points.length > 0 && (
                    <CardContent className="pb-3">
                      <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">
                        核心知识点
                      </p>
                      <ul className="space-y-1">
                        {review.key_points.map((point, i) => (
                          <li key={i} className="text-sm text-gray-700 flex gap-2">
                            <span className="text-gray-300 shrink-0">·</span>
                            <span>{point}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  )}

                  {review.reflection && (
                    <>
                      <Separator className="mx-4" />
                      <CardContent className="pt-3">
                        <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">
                          感想
                        </p>
                        <p className="text-sm text-gray-600">{review.reflection}</p>
                      </CardContent>
                    </>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* 行动清单 */}
        {actionItems && actionItems.length > 0 && (
          <>
            <Separator className="my-6" />
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-4">
                <CheckSquare className="w-5 h-5" />
                <h2 className="text-lg font-semibold">行动清单</h2>
              </div>
              <Card>
                <CardContent className="pt-6">
                  <ul className="space-y-3">
                    {actionItems.map((item: ActionItem) => (
                      <li key={item.id} className="flex items-start gap-3">
                        <Square className="w-5 h-5 text-gray-300 shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-800">
                            {item.action_description}
                          </p>
                          {item.due_date && (
                            <p className="text-xs text-gray-400 mt-1">
                              计划完成：{item.due_date}
                            </p>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>
          </>
        )}

        {/* 知识延伸 */}
        <Separator className="my-6" />
        <div className="mb-24">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              <h2 className="text-lg font-semibold">知识延伸</h2>
            </div>
            <Link href={`/books/${id}/extend`}>
              <Button variant="outline" size="sm">
                <Plus className="w-4 h-4 mr-1" />
                添加延伸线索
              </Button>
            </Link>
          </div>

          {!extendedReadings || extendedReadings.length === 0 ? (
            <div className="text-center py-8 border border-dashed border-gray-200 rounded-lg">
              <p className="text-gray-400">暂无延伸记录</p>
              <p className="text-gray-300 text-sm mt-1">
                记录这本书激发的新兴趣或推荐书目
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {extendedReadings.map((item: ExtendedReading) => (
                <Card key={item.id}>
                  <CardContent className="pt-6">
                    {item.keywords && item.keywords.length > 0 && (
                      <div className="mb-3">
                        <div className="flex flex-wrap gap-2">
                          {item.keywords.map((keyword, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">
                              {keyword}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {item.recommended_book_title && (
                      <div className="flex items-start gap-2">
                        <BookText className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-gray-800">
                            {item.recommended_book_title}
                          </p>
                          {item.recommended_book_author && (
                            <p className="text-xs text-gray-400">
                              {item.recommended_book_author}
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Floating Action Buttons */}
        <div className="fixed bottom-6 right-6 flex flex-col gap-3 items-end">
          {isCompleted ? (
            <div className="bg-gray-900 text-white px-4 py-2 rounded-full text-sm font-medium shadow-lg flex items-center gap-2">
              <span>本书已结案</span>
            </div>
          ) : (
            <>
              <Link href={`/books/${id}/action`}>
                <Button
                  size="sm"
                  className="bg-gray-800 text-white hover:bg-gray-700 shadow-lg rounded-full"
                >
                  <Flag className="w-4 h-4 mr-1" />
                  完结并生成行动清单
                </Button>
              </Link>
              <Link href={`/books/${id}/review`}>
                <Button
                  size="lg"
                  className="bg-black text-white hover:bg-gray-800 shadow-lg rounded-full"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  添加章节复盘
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  )
}