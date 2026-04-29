'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { useRouter } from 'next/navigation'
import { BookOpen, Plus, ArrowLeft, CheckCircle, Circle, Flag, CheckSquare, Square, Sparkles, BookText, Shield, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { createClient } from '@/lib/supabase/client'
import { advanceChapter } from '@/lib/actions'
import { GatekeeperModal } from '@/components/gatekeeper-modal'
import type { Book, ChapterReview, ActionItem, ExtendedReading, BookStatus, ReadingMode } from '@/types'
import { READING_MODE_LABELS, BOOK_GENRE_LABELS } from '@/types'

const statusMap: Record<BookStatus, { label: string; className: string }> = {
  'to-read': { label: '待阅读', className: 'bg-gray-100 text-gray-800' },
  'in-progress': { label: '阅读中', className: 'bg-black text-white' },
  'completed': { label: '已读完', className: 'bg-gray-400 text-white' },
  'abandoned': { label: '已放弃', className: 'bg-red-100 text-red-800' },
}

export default function BookDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const [bookId, setBookId] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [book, setBook] = useState<Book | null>(null)
  const [reviews, setReviews] = useState<ChapterReview[]>([])
  const [actionItems, setActionItems] = useState<ActionItem[]>([])
  const [extendedReadings, setExtendedReadings] = useState<ExtendedReading[]>([])
  const [showGatekeeper, setShowGatekeeper] = useState(false)
  const [isAdvancing, setIsAdvancing] = useState(false)

  useEffect(() => {
    Promise.all([createClient().auth.getUser(), (params as any).id]).then(async ([{ data: { user } }, id]) => {
      if (!user) { redirect('/login'); return }
      setUserId(user.id)
      setBookId(id)

      const supabase = createClient()
      const { data: bookData } = await supabase.from('books').select('*').eq('id', id).eq('user_id', user.id).single()
      if (!bookData) { notFound(); return }
      setBook(bookData as Book)

      const [reviewsRes, actionsRes, extendedRes] = await Promise.all([
        supabase.from('chapter_reviews').select('*').eq('book_id', id).eq('user_id', user.id).order('chapter_number', { ascending: true }),
        supabase.from('action_items').select('*').eq('book_id', id).eq('user_id', user.id).order('created_at', { ascending: true }),
        supabase.from('extended_reading').select('*').eq('book_id', id).eq('user_id', user.id).order('created_at', { ascending: true }),
      ])

      setReviews(reviewsRes.data || [])
      setActionItems(actionsRes.data || [])
      setExtendedReadings(extendedRes.data || [])
    })
  }, [params])

  const handleAdvanceChapter = async (reflection: string) => {
    if (!bookId) throw new Error('No book ID')
    const result = await advanceChapter(bookId, reflection)

    if (result.success && result.passed && book) {
      // Refresh book data
      setBook({ ...book, current_chapter: book.current_chapter + 1 })
    }

    return {
      passed: result.passed || false,
      feedback: result.feedback || '',
      actionable_advice: result.actionable_advice || '',
    }
  }

  const handleOpenGatekeeper = () => {
    setShowGatekeeper(true)
  }

  const handleSkimAdvance = async () => {
    if (!bookId || !book) return
    setIsAdvancing(true)
    await advanceChapter(bookId, '粗读推进')
    // Refresh
    const supabase = createClient()
    const { data } = await supabase.from('books').select('*').eq('id', bookId).single()
    if (data) setBook(data as Book)
    setIsAdvancing(false)
  }

  if (!book) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    )
  }

  const isCompleted = book.status === 'completed'
  const isAbandoned = book.status === 'abandoned'

  const handleAbandon = async () => {
    const reason = prompt('请输入放弃原因（选填）：')
    if (!bookId) return
    const supabase = createClient()
    await supabase.from('books').update({ status: 'abandoned' }).eq('id', bookId).eq('user_id', userId!)
    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen bg-white text-black p-6 md:p-12">
      <GatekeeperModal
        isOpen={showGatekeeper}
        onClose={() => setShowGatekeeper(false)}
        onSubmit={handleAdvanceChapter}
        bookGenre={book.book_genre || 'philosophy'}
        chapterNumber={book.current_chapter + 1}
      />

      <div className="max-w-3xl mx-auto">
        <Link href="/dashboard" className="inline-flex items-center text-sm text-gray-500 hover:text-black mb-4"><ArrowLeft className="w-4 h-4 mr-1" />返回首页</Link>

        <div className="flex items-start justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold">{book.title}</h1>
            {book.author && <p className="text-gray-500">{book.author}</p>}
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <Badge className={statusMap[book.status as BookStatus].className}>{statusMap[book.status as BookStatus].label}</Badge>
              {book.reading_mode && (
                <Badge variant="outline">{READING_MODE_LABELS[book.reading_mode as ReadingMode]}</Badge>
              )}
              {book.book_genre && (
                <Badge variant="secondary">{BOOK_GENRE_LABELS[book.book_genre as keyof typeof BOOK_GENRE_LABELS]}</Badge>
              )}
            </div>
          </div>
        </div>

        {/* Progress Control Area */}
        {!isCompleted && (
          <Card className="mb-6 bg-gradient-to-r from-gray-50 to-orange-50 border-orange-200">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {book.reading_mode === 'deep' ? (
                    <Shield className="w-6 h-6 text-orange-500" />
                  ) : (
                    <BookOpen className="w-6 h-6 text-gray-400" />
                  )}
                  <div>
                    <p className="font-medium">当前进度：第 {book.current_chapter || 0} 章</p>
                    <p className="text-sm text-gray-500">
                      {book.reading_mode === 'deep' ? '精读模式需要 AI 验证通过' : '粗读模式可随意推进'}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  {book.reading_mode === 'deep' ? (
                    <Button
                      onClick={handleOpenGatekeeper}
                      className="bg-orange-500 hover:bg-orange-600 text-white"
                      disabled={isAdvancing}
                    >
                      <Shield className="w-4 h-4 mr-1" />
                      AI 守门员验证
                    </Button>
                  ) : (
                    <Button
                      onClick={handleSkimAdvance}
                      className="bg-gray-800 hover:bg-gray-700 text-white"
                      disabled={isAdvancing}
                    >
                      {isAdvancing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4 mr-1" />}
                      推进下一章
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {book.core_questions && book.core_questions.length > 0 && (
          <Card className="mb-6 bg-gray-50"><CardHeader className="pb-3"><p className="text-xs text-gray-400 uppercase tracking-wide">核心诉求</p></CardHeader><CardContent className="pt-0">
            <ul>{book.core_questions.map((q: string, i: number) => <li key={i} className="text-sm">Q{i+1}. {q}</li>)}</ul>
          </CardContent></Card>
        )}
        <Separator className="my-6" />
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-4">章节复盘 <span className="text-gray-400 font-normal">{reviews.length} 章</span></h2>
          {!reviews.length ? <div className="text-center py-12 border border-dashed border-gray-200 rounded-lg"><p className="text-gray-400">暂无复盘记录</p></div> : reviews.map((r: ChapterReview) => (
            <Card key={r.id} className="mb-4">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium">第 {r.chapter_number} 章{r.chapter_title && ` · ${r.chapter_title}`}</span>
                  {r.answers_core_questions ? <CheckCircle className="w-4 h-4 text-green-600" /> : <Circle className="w-4 h-4 text-gray-300" />}
                </div>
              </CardHeader>
              {r.key_points && r.key_points.length > 0 && <CardContent><p className="text-xs text-gray-400 uppercase mb-1">核心知识点</p><ul>{r.key_points.map((p: string, i: number) => <li key={i} className="text-sm text-gray-700">· {p}</li>)}</ul></CardContent>}
              {r.reflection && <CardContent><p className="text-xs text-gray-400 uppercase mb-1">感想</p><p className="text-sm text-gray-600">{r.reflection}</p></CardContent>}
            </Card>
          ))}
        </div>
        {actionItems.length > 0 && (<><Separator className="my-6" /><div className="mb-6"><div className="flex items-center gap-2 mb-4"><CheckSquare className="w-5 h-5" /><h2 className="text-lg font-semibold">行动清单</h2></div><Card><CardContent className="pt-6"><ul className="space-y-3">{actionItems.map((item: ActionItem) => <li key={item.id} className="flex items-start gap-3"><Square className="w-5 h-5 text-gray-300 shrink-0 mt-0.5" /><div><p className="text-sm">{item.action_description}</p>{item.due_date && <p className="text-xs text-gray-400 mt-1">截止：{item.due_date}</p>}</div></li>)}</ul></CardContent></Card></div></>)}
        <Separator className="my-6" />
        <div className="mb-24">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2"><Sparkles className="w-5 h-5" /><h2 className="text-lg font-semibold">知识延伸</h2></div>
            <Link href={`/books/${bookId}/extend`}><Button variant="outline" size="sm"><Plus className="w-4 h-4 mr-1" />添加延伸线索</Button></Link>
          </div>
          {!extendedReadings.length ? <div className="text-center py-8 border border-dashed border-gray-200 rounded-lg"><p className="text-gray-400">暂无延伸记录</p></div> : extendedReadings.map((item: ExtendedReading) => (
            <Card key={item.id} className="mb-3"><CardContent className="pt-6">
              {item.keywords && item.keywords.length > 0 && <div className="flex flex-wrap gap-2 mb-2">{item.keywords.map((k: string, i: number) => <Badge key={i} variant="secondary">{k}</Badge>)}</div>}
              {item.recommended_book_title && <div className="flex items-start gap-2"><BookText className="w-4 h-4 text-gray-400 mt-0.5" /><div><p className="text-sm font-medium">{item.recommended_book_title}</p>{item.recommended_book_author && <p className="text-xs text-gray-400">{item.recommended_book_author}</p>}</div></div>}
            </CardContent></Card>
          ))}
        </div>
        <div className="fixed bottom-6 right-6 flex flex-col gap-3 items-end">
          {isCompleted && <div className="bg-gray-900 text-white px-4 py-2 rounded-full text-sm font-medium shadow-lg">本书已结案</div>}
          {isAbandoned && <div className="bg-red-100 text-red-800 px-4 py-2 rounded-full text-sm font-medium shadow-lg">已放弃阅读</div>}
          {!isCompleted && !isAbandoned && (<>
            <Button variant="outline" size="sm" onClick={handleAbandon} className="border-red-200 text-red-600 hover:bg-red-50 shadow-lg rounded-full">
              <Flag className="w-4 h-4 mr-1" />放弃阅读
            </Button>
            <Link href={`/books/${bookId}/action`}><Button size="sm" className="bg-gray-800 text-white hover:bg-gray-700 shadow-lg rounded-full"><Flag className="w-4 h-4 mr-1" />完结并生成行动清单</Button></Link>
            <Link href={`/books/${bookId}/review`}><Button size="lg" className="bg-black text-white hover:bg-gray-800 shadow-lg rounded-full"><Plus className="w-5 h-5 mr-2" />添加章节复盘</Button></Link>
          </>)}
        </div>
      </div>
    </div>
  )
}