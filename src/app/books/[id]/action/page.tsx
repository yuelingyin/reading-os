'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, BookOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { createClient } from '@/lib/supabase/client'
import type { Book } from '@/types'

const supabase = createClient()

export default function ActionPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const [bookId, setBookId] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [book, setBook] = useState<Book | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [actionDescription, setActionDescription] = useState('')
  const [dueDate, setDueDate] = useState('')

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
    if (!bookId || !userId || !actionDescription.trim()) return
    setIsLoading(true)
    await supabase.from('action_items').insert({ user_id: userId, book_id: bookId, action_description: actionDescription.trim(), due_date: dueDate || null })
    await supabase.from('books').update({ status: 'completed' }).eq('id', bookId).eq('user_id', userId)
    setIsLoading(false)
    router.push(`/books/${bookId}`)
  }

  return (
    <div className="min-h-screen bg-white text-black p-6 md:p-12">
      <div className="max-w-2xl mx-auto">
        <Link href={bookId ? `/books/${bookId}` : '/'} className="inline-flex items-center text-sm text-gray-500 hover:text-black mb-4"><ArrowLeft className="w-4 h-4 mr-1" />返回书籍详情</Link>
        <div className="flex items-center gap-3 mb-2"><BookOpen className="w-6 h-6" /><h1 className="text-2xl font-bold tracking-tight">书籍结案与行动转化</h1></div>
        {book && <p className="text-gray-500 ml-9">《{book.title}》</p>}
        <Card className="mt-6">
          <CardHeader><CardTitle className="text-base font-normal text-gray-600">读完这本书，你决定在接下来的生活中做出什么具体改变？</CardTitle></CardHeader>
          <CardContent className="pt-0">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2"><Label htmlFor="actionDescription">行动描述 <span className="text-red-500">*</span></Label><Textarea id="actionDescription" placeholder="例如：下周三前去银行开一个定投账户" value={actionDescription} onChange={(e) => setActionDescription(e.target.value)} rows={4} required /></div>
              <div className="space-y-2"><Label htmlFor="dueDate">计划完成时间</Label><Input id="dueDate" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></div>
              <Separator />
              <div className="flex justify-end"><Button type="submit" disabled={isLoading || !actionDescription.trim() || !userId} className="bg-black text-white hover:bg-gray-800">{isLoading ? '提交中...' : '确认结案'}</Button></div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}