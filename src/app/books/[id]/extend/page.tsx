'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { createClient } from '@/lib/supabase/client'
import type { Book } from '@/types'

export default function ExtendPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const [bookId, setBookId] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [book, setBook] = useState<Book | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [keywords, setKeywords] = useState('')
  const [recommendedTitle, setRecommendedTitle] = useState('')
  const [recommendedAuthor, setRecommendedAuthor] = useState('')

  useEffect(() => {
    const supabase = createClient()
    Promise.all([supabase.auth.getUser(), params.then(p => p.id)]).then(([{ data: { user } }, id]) => {
      if (!user) { router.push('/login'); return }
      setUserId(user.id)
      setBookId(id)
      supabase.from('books').select('*').eq('id', id).eq('user_id', user.id).single().then(({ data }) => setBook(data))
    })
  }, [params, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!bookId || !userId) return
    const keywordArray = keywords.split(',').map(k => k.trim()).filter(k => k !== '')
    const supabase = createClient()
    setIsLoading(true)
    await supabase.from('extended_reading').insert({
      user_id: userId, book_id: bookId,
      keywords: keywordArray.length > 0 ? keywordArray : null,
      recommended_book_title: recommendedTitle.trim() || null,
      recommended_book_author: recommendedAuthor.trim() || null,
    })
    setIsLoading(false)
    router.push(`/books/${bookId}`)
  }

  return (
    <div className="min-h-screen bg-white text-black p-6 md:p-12">
      <div className="max-w-2xl mx-auto">
        <Link href={bookId ? `/books/${bookId}` : '/'} className="inline-flex items-center text-sm text-gray-500 hover:text-black mb-4"><ArrowLeft className="w-4 h-4 mr-1" />返回书籍详情</Link>
        <div className="flex items-center gap-3 mb-2"><Sparkles className="w-6 h-6" /><h1 className="text-2xl font-bold tracking-tight">记录知识延伸点</h1></div>
        {book && <p className="text-gray-500 ml-9">《{book.title}》</p>}
        <Card className="mt-6">
          <CardHeader><CardTitle className="text-base font-normal text-gray-600">这本书为你打开了哪扇新大门？记录下感兴趣的关键词，或书中推荐的下一本书。</CardTitle></CardHeader>
          <CardContent className="pt-0">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2"><Label htmlFor="keywords">核心关键词</Label><Input id="keywords" placeholder="多个词请用逗号分隔，例如：行为经济学, 丹尼尔·卡尼曼" value={keywords} onChange={(e) => setKeywords(e.target.value)} /><p className="text-xs text-gray-400">记录这本书激发你好奇的新领域或概念</p></div>
              <Separator />
              <div className="space-y-2"><Label htmlFor="recommendedTitle">推荐关联书名</Label><Input id="recommendedTitle" placeholder="这本书让你想到的另一本书（选填）" value={recommendedTitle} onChange={(e) => setRecommendedTitle(e.target.value)} /></div>
              <div className="space-y-2"><Label htmlFor="recommendedAuthor">推荐关联作者</Label><Input id="recommendedAuthor" placeholder="该书作者（选填）" value={recommendedAuthor} onChange={(e) => setRecommendedAuthor(e.target.value)} /></div>
              <Separator />
              <div className="flex justify-end"><Button type="submit" disabled={isLoading || !userId} className="bg-black text-white hover:bg-gray-800">{isLoading ? '保存中...' : '保存延伸线索'}</Button></div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
