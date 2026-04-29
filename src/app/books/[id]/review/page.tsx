'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { createClient } from '@/lib/supabase/client'
import type { Book } from '@/types'

const supabase = createClient()

export default function ChapterReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const [bookId, setBookId] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [book, setBook] = useState<Book | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [chapterNumber, setChapterNumber] = useState(1)
  const [chapterTitle, setChapterTitle] = useState('')
  const [keyPoints, setKeyPoints] = useState<string[]>([''])
  const [answersCoreQuestions, setAnswersCoreQuestions] = useState(false)
  const [reflection, setReflection] = useState('')

  useEffect(() => {
    Promise.all([supabase.auth.getUser(), params.then(p => p.id)]).then(([{ data: { user } }, id]) => {
      if (!user) { router.push('/login'); return }
      setUserId(user.id)
      setBookId(id)
      supabase.from('books').select('*').eq('id', id).eq('user_id', user.id).single().then(({ data }) => setBook(data))
    })
  }, [params, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!bookId || !userId || !chapterNumber) return
    const filteredKeyPoints = keyPoints.filter(p => p.trim() !== '')
    setIsLoading(true)
    await supabase.from('chapter_reviews').insert({
      user_id: userId, book_id: bookId, chapter_number: chapterNumber,
      chapter_title: chapterTitle.trim() || null,
      key_points: filteredKeyPoints.length > 0 ? filteredKeyPoints : null,
      answers_core_questions: answersCoreQuestions,
      reflection: reflection.trim() || null,
    })
    if (book?.status === 'to-read') {
      await supabase.from('books').update({ status: 'in-progress' }).eq('id', bookId).eq('user_id', userId)
    }
    setIsLoading(false)
    router.push(`/books/${bookId}`)
  }

  return (
    <div className="min-h-screen bg-white text-black p-6 md:p-12">
      <div className="max-w-2xl mx-auto">
        <Link href={bookId ? `/books/${bookId}` : '/'} className="inline-flex items-center text-sm text-gray-500 hover:text-black mb-4"><ArrowLeft className="w-4 h-4 mr-1" />返回书籍详情</Link>
        <h1 className="text-2xl font-bold tracking-tight mb-2">章节复盘微打卡</h1>
        {book && <p className="text-gray-500 mb-8">《{book.title}》</p>}
        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2"><Label htmlFor="chapterNumber">章节序号 <span className="text-red-500">*</span></Label><Input id="chapterNumber" type="number" min="1" value={chapterNumber} onChange={(e) => setChapterNumber(Number(e.target.value))} required /></div>
              <div className="space-y-2"><Label htmlFor="chapterTitle">章节标题</Label><Input id="chapterTitle" placeholder="输入章节标题（选填）" value={chapterTitle} onChange={(e) => setChapterTitle(e.target.value)} /></div>
              <Separator />
              <div className="space-y-2">
                <Label>核心知识点</Label>
                {keyPoints.map((p, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-sm text-gray-400 w-6 shrink-0">{i+1}.</span>
                    <Textarea placeholder={`要点 ${i+1}`} value={p} onChange={(e) => { const u = [...keyPoints]; u[i] = e.target.value; setKeyPoints(u) }} rows={2} className="resize-none" />
                    {keyPoints.length > 1 && <Button type="button" variant="ghost" size="icon" onClick={() => setKeyPoints(keyPoints.filter((_, j) => j !== i))}>×</Button>}
                  </div>
                ))}
                {keyPoints.length < 3 && <Button type="button" variant="outline" size="sm" onClick={() => setKeyPoints([...keyPoints, ''])}>添加要点</Button>}
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div><Label className="text-base">灵魂拷问</Label><p className="text-sm text-gray-500">这一章是否解答了你立项时的核心问题？</p></div>
                <div className="flex items-center gap-2">{answersCoreQuestions && <CheckCircle className="w-5 h-5 text-green-600" />}<Switch checked={answersCoreQuestions} onCheckedChange={setAnswersCoreQuestions} /></div>
              </div>
              <div className="space-y-2"><Label htmlFor="reflection">简短感想</Label><Textarea id="reflection" placeholder="记录你的读后感想（选填）" value={reflection} onChange={(e) => setReflection(e.target.value)} rows={3} /></div>
              <Separator />
              <div className="flex justify-end"><Button type="submit" disabled={isLoading || !chapterNumber || !userId} className="bg-black text-white hover:bg-gray-800">{isLoading ? '提交中...' : '提交复盘'}</Button></div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}