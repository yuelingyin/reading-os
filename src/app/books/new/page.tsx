'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { BookOpen, Plus, X, Search, Loader2, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { createClient } from '@/lib/supabase/client'
import { searchBooks, type GoogleBook } from '@/lib/google-books'
import type { Category, ReadingMode, BookGenre } from '@/types'
import { READING_MODE_LABELS, BOOK_GENRE_LABELS } from '@/types'

export default function NewBookPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [title, setTitle] = useState('')
  const [author, setAuthor] = useState('')
  const [coverUrl, setCoverUrl] = useState('')
  const [readingMode, setReadingMode] = useState<ReadingMode>('skim')
  const [bookGenre, setBookGenre] = useState<BookGenre | ''>('')
  const [motivation, setMotivation] = useState('')
  const [coreQuestions, setCoreQuestions] = useState<string[]>([''])
  const [categoryId, setCategoryId] = useState<string>('')

  // Search state
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<GoogleBook[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showResults, setShowResults] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUserId(user.id)
        supabase.from('categories').select('*').eq('user_id', user.id).then(({ data }) => {
          if (data) setCategories(data)
        })
      }
      else router.push('/login')
    })
  }, [router])

  const handleSearch = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSearchResults([])
      return
    }
    setIsSearching(true)
    const results = await searchBooks(query)
    setSearchResults(results)
    setIsSearching(false)
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery) handleSearch(searchQuery)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery, handleSearch])

  const selectBook = (book: GoogleBook) => {
    setTitle(book.title)
    setAuthor(book.authors.join(', '))
    setCoverUrl(book.thumbnail || '')
    setSearchQuery('')
    setSearchResults([])
    setShowResults(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !motivation.trim() || !userId || !bookGenre) return
    const filteredQuestions = coreQuestions.filter(q => q.trim() !== '')
    setIsLoading(true)
    const supabase = createClient()
    const { error } = await supabase.from('books').insert({
      user_id: userId,
      title: title.trim(),
      author: author.trim() || null,
      cover_url: coverUrl || null,
      reading_mode: readingMode,
      book_genre: bookGenre,
      reading_motivation: motivation.trim(),
      core_questions: filteredQuestions.length > 0 ? filteredQuestions : null,
      category_id: categoryId || null,
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

        {/* Book Search Section */}
        <Card className="mb-6 border-2 border-dashed border-gray-200">
          <CardContent className="pt-6">
            <div className="relative">
              <Label>搜索书籍（可选）</Label>
              <div className="relative mt-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="输入书名搜索..."
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setShowResults(true) }}
                  onFocus={() => setShowResults(true)}
                  className="pl-10"
                />
                {isSearching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-gray-400" />}
              </div>

              {showResults && searchResults.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-80 overflow-y-auto">
                  {searchResults.map((book) => (
                    <button
                      key={book.id}
                      type="button"
                      onClick={() => selectBook(book)}
                      className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 text-left"
                    >
                      {book.thumbnail ? (
                        <img src={book.thumbnail} alt="" className="w-10 h-14 object-cover rounded" />
                      ) : (
                        <div className="w-10 h-14 bg-gray-100 rounded flex items-center justify-center">
                          <BookOpen className="w-4 h-4 text-gray-400" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{book.title}</p>
                        <p className="text-xs text-gray-500 truncate">{book.authors.join(', ')}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-2">搜索可自动填充书名、作者和封面</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title">书名 <span className="text-red-500">*</span></Label>
                <Input id="title" placeholder="输入或搜索书名" value={title} onChange={(e) => setTitle(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="author">作者</Label>
                <Input id="author" placeholder="输入作者（选填）" value={author} onChange={(e) => setAuthor(e.target.value)} />
              </div>

              {/* Reading Mode Selection */}
              <div className="space-y-2">
                <Label>阅读模式 <span className="text-red-500">*</span></Label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setReadingMode('skim')}
                    className={`p-4 rounded-lg border-2 text-left transition-colors ${readingMode === 'skim' ? 'border-black bg-gray-50' : 'border-gray-200 hover:border-gray-400'}`}
                  >
                    <p className="font-medium">粗读模式 (skim)</p>
                    <p className="text-sm text-gray-500 mt-1">随意推进进度，无需 AI 验证</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setReadingMode('deep')}
                    className={`p-4 rounded-lg border-2 text-left transition-colors ${readingMode === 'deep' ? 'border-black bg-gray-50' : 'border-gray-200 hover:border-gray-400'}`}
                  >
                    <p className="font-medium">精读模式 (deep)</p>
                    <p className="text-sm text-gray-500 mt-1">AI 守门员调考通过后才能解锁下一章</p>
                  </button>
                </div>
                <div className="flex items-start gap-2 mt-2 p-3 bg-blue-50 rounded-lg">
                  <Info className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                  <p className="text-xs text-blue-700">
                    {readingMode === 'skim'
                      ? '粗读模式可随意推进进度，快速扫描书籍内容。'
                      : '精读模式必须通过 AI 调考才能解锁下一章，确保深度理解。'}
                  </p>
                </div>
              </div>

              {/* Book Genre Selection */}
              <div className="space-y-2">
                <Label>书籍类型 <span className="text-red-500">*</span></Label>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.entries(BOOK_GENRE_LABELS) as [BookGenre, string][]).map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setBookGenre(key)}
                      className={`p-3 rounded-lg border text-sm transition-colors ${bookGenre === key ? 'border-black bg-gray-50 font-medium' : 'border-gray-200 hover:border-gray-400'}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {categories.length > 0 && (
                <div className="space-y-2">
                  <Label>分类（可选）</Label>
                  <div className="flex flex-wrap gap-2">
                    {categories.map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setCategoryId(categoryId === cat.id ? '' : cat.id)}
                        className={`px-3 py-1 rounded-full text-sm border transition-colors ${categoryId === cat.id ? 'bg-black text-white border-black' : 'border-gray-200 hover:border-gray-400'}`}
                      >
                        {cat.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

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
                <Button type="submit" disabled={isLoading || !title.trim() || !motivation.trim() || !userId || !bookGenre} className="bg-black text-white hover:bg-gray-800">{isLoading ? '创建中...' : '确认立项'}</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}