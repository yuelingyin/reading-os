'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { BookOpen, Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

export default function NewBookPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [author, setAuthor] = useState('')
  const [motivation, setMotivation] = useState('')
  const [coreQuestions, setCoreQuestions] = useState<string[]>([''])

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id)
      else router.push('/login')
    })
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !motivation.trim() || !userId) return
    const filteredQuestions = coreQuestions.filter(q => q.trim() !== '')
    setIsLoading(true)
    const { error } = await supabase.from('books').insert({
      user_id: userId,
      title: title.trim(),
      author: author.trim() || null,
      reading_motivation: motivation.trim(),
      core_questions: filteredQuestions.length > 0 ? filteredQuestions : null,
      status: 'to-read',
    })
    setIsLoading(false)
    if (!error) router.push('/dashboard')
  }

  return (
    <div className="min-h-screen bg-white text-black p-6 md:p-12">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <BookOpen className="w-8 h-8" />
          <h1 className="text-2xl font-bold tracking-tight">发起新阅读项目</h1>
        </div>
        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2"><Label htmlFor="title">书名 <span className="text-red-500">*</span></Label><Input id="title" placeholder="输入书名" value={title} onChange={(e) => setTitle(e.target.value)} required /></div>
              <div className="space-y-2"><Label htmlFor="author">作者</Label><Input id="author" placeholder="输入作者（选填）" value={author} onChange={(e) => setAuthor(e.target.value)} /></div>
              <Separator />
              <div className="space-y-2">
                <Label htmlFor="motivation">读书动机 <span className="text-red-500">*</span></Label>
                <p className="text-sm text-gray-500">我最近遇到了什么痛点？为什么要读这本？</p>
                <Textarea id="motivation" placeholder="描述你当前的困惑或想解决的问题..." value={motivation} onChange={(e) => setMotivation(e.target.value)} rows={4} required />
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div><Label>核心诉求</Label><p className="text-sm text-gray-500">我希望这本书能回答我的问题（1-3个）</p></div>
                  {coreQuestions.length < 3 && <Button type="button" variant="outline" size="sm" onClick={() => setCoreQuestions([...coreQuestions, ''])}><Plus className="w-4 h-4 mr-1" />添加问题</Button>}
                </div>
                {coreQuestions.map((q, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Badge variant="secondary" className="shrink-0">Q{i+1}</Badge>
                    <Input placeholder={`问题 ${i+1}`} value={q} onChange={(e) => { const u = [...coreQuestions]; u[i] = e.target.value; setCoreQuestions(u) }} />
                    {coreQuestions.length > 1 && <Button type="button" variant="ghost" size="icon" onClick={() => setCoreQuestions(coreQuestions.filter((_, j) => j !== i))}><X className="w-4 h-4" /></Button>}
                  </div>
                ))}
              </div>
              <Separator />
              <div className="flex justify-end">
                <Button type="submit" disabled={isLoading || !title.trim() || !motivation.trim() || !userId} className="bg-black text-white hover:bg-gray-800">{isLoading ? '创建中...' : '确认立项'}</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}