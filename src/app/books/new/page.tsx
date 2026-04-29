'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { BookOpen, Plus, X, Search, Loader2, Sparkles, ArrowRight, Check, MessageCircle, Zap, BookMarked } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { createClient } from '@/lib/supabase/client'
import { searchBooks } from '@/lib/book-search'
import { analyzeBookForUser } from '@/lib/book-actions'
import type { Category, ReadingMode, BookGenre, SearchResult, AIRecommendation } from '@/types'
import { READING_MODE_LABELS, BOOK_GENRE_LABELS } from '@/types'

type Step = 'input' | 'ai-mode' | 'ai-analyzing' | 'review' | 'finalize'

export default function NewBookPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('input')
  const [isLoading, setIsLoading] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [categories, setCategories] = useState<Category[]>([])

  // Book info
  const [title, setTitle] = useState('')
  const [author, setAuthor] = useState('')
  const [coverUrl, setCoverUrl] = useState('')

  // Search state (optional)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showResults, setShowResults] = useState(false)

  // AI pre-read state
  const [selectedAIMode, setSelectedAIMode] = useState<'goal' | 'direct' | null>(null)
  const [userGoal, setUserGoal] = useState('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [aiRecommendation, setAiRecommendation] = useState<AIRecommendation | null>(null)

  // Form state
  const [readingMode, setReadingMode] = useState<ReadingMode>('skim')
  const [bookGenre, setBookGenre] = useState<BookGenre | ''>('')
  const [motivation, setMotivation] = useState('')
  const [coreQuestions, setCoreQuestions] = useState<string[]>([''])
  const [categoryId, setCategoryId] = useState<string>('')

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

  // Search with debounce
  useEffect(() => {
    if (!searchQuery || searchQuery.length < 2) {
      setSearchResults([])
      return
    }
    const timer = setTimeout(async () => {
      setIsSearching(true)
      const results = await searchBooks(searchQuery)
      setSearchResults(results)
      setIsSearching(false)
    }, 500)
    return () => clearTimeout(timer)
  }, [searchQuery])

  const selectBook = (book: SearchResult) => {
    setTitle(book.title)
    setAuthor(book.authors.join(', '))
    setCoverUrl(book.coverUrl || '')
    setSearchQuery('')
    setSearchResults([])
    setShowResults(false)
  }

  const handleContinue = () => {
    if (!title.trim()) return
    setStep('ai-mode')
  }

  const handleSkipAI = () => {
    setStep('finalize')
  }

  const handleAIModeSelect = (mode: 'goal' | 'direct') => {
    setSelectedAIMode(mode)
    setStep('ai-analyzing')
    runAIAnalysis(mode)
  }

  const runAIAnalysis = async (mode: 'goal' | 'direct') => {
    if (!title.trim()) return
    setIsAnalyzing(true)
    setAiRecommendation(null)
    const result = await analyzeBookForUser(
      title,
      author,
      mode === 'goal' ? userGoal : undefined
    )
    if (result.success && result.recommendation) {
      setAiRecommendation(result.recommendation)
      setCoreQuestions(result.recommendation.core_questions.length > 0
        ? result.recommendation.core_questions
        : [''])
      if (result.recommendation.suggested_genre) {
        setBookGenre(result.recommendation.suggested_genre)
      }
      setStep('review')
    } else {
      alert(result.error || 'AI 分析失败，请重试或跳过')
      setStep('ai-mode')
    }
    setIsAnalyzing(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !userId) return
    const filteredQuestions = coreQuestions.filter(q => q.trim() !== '')
    setIsLoading(true)
    const supabase = createClient()
    const { error } = await supabase.from('books').insert({
      user_id: userId,
      title: title.trim(),
      author: author.trim() || null,
      cover_url: coverUrl || null,
      reading_mode: readingMode,
      book_genre: bookGenre || null,
      reading_motivation: motivation.trim() || null,
      core_questions: filteredQuestions.length > 0 ? filteredQuestions : null,
      category_id: categoryId || null,
      status: 'to-read',
    })
    setIsLoading(false)
    if (!error) router.push('/dashboard')
  }

  // ============ STEP 1: Enter Book Title ============
  if (step === 'input') {
    return (
      <div className="min-h-screen bg-white text-black p-6 md:p-12">
        <div className="max-w-xl mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <BookMarked className="w-8 h-8" />
            <h1 className="text-2xl font-bold tracking-tight">记录一本书</h1>
          </div>

          <Card className="mb-6">
            <CardContent className="pt-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">书名 <span className="text-red-500">*</span></Label>
                <Input
                  id="title"
                  placeholder="输入书名，或者..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="text-lg"
                />
              </div>

              {/* Optional search */}
              <div className="space-y-2">
                <Label>搜索补充信息（可选）</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="搜索书名自动填充作者和封面"
                    value={searchQuery}
                    onChange={(e) => { setSearchQuery(e.target.value); setShowResults(true) }}
                    onFocus={() => setShowResults(true)}
                    className="pl-10"
                  />
                  {isSearching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-gray-400" />}
                </div>

                {showResults && searchResults.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {searchResults.slice(0, 6).map((book) => (
                      <button
                        key={book.id}
                        type="button"
                        onClick={() => selectBook(book)}
                        className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 text-left"
                      >
                        {book.coverUrl ? (
                          <img src={book.coverUrl} alt="" className="w-8 h-12 object-cover rounded" />
                        ) : (
                          <div className="w-8 h-12 bg-gray-100 rounded flex items-center justify-center">
                            <BookOpen className="w-3 h-3 text-gray-400" />
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

              <div className="space-y-2">
                <Label htmlFor="author">作者（可选）</Label>
                <Input
                  id="author"
                  placeholder="输入作者"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button
              onClick={handleContinue}
              disabled={!title.trim()}
              className="flex-1 bg-black text-white hover:bg-gray-800"
            >
              继续
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // ============ STEP 2: Choose AI Mode ============
  if (step === 'ai-mode') {
    return (
      <div className="min-h-screen bg-white text-black p-6 md:p-12">
        <div className="max-w-xl mx-auto">
          <button onClick={() => setStep('input')} className="text-sm text-gray-500 hover:text-black mb-4">
            ← 返回修改
          </button>

          <div className="flex items-center gap-3 mb-8">
            <Sparkles className="w-8 h-8 text-purple-500" />
            <h1 className="text-2xl font-bold tracking-tight">AI 辅助设置</h1>
          </div>

          <Card className="mb-6 bg-gray-50">
            <CardContent className="pt-4">
              <p className="font-medium">{title}</p>
              {author && <p className="text-sm text-gray-500">{author}</p>}
            </CardContent>
          </Card>

          <p className="text-gray-600 mb-4">让 AI 帮你设置阅读目标和核心问题？</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <button
              onClick={() => handleAIModeSelect('goal')}
              className="p-6 rounded-xl border-2 border-purple-200 bg-purple-50 hover:border-purple-400 transition-colors text-left"
            >
              <div className="flex items-center gap-3 mb-3">
                <MessageCircle className="w-6 h-6 text-purple-500" />
                <span className="font-semibold">方式 A</span>
              </div>
              <p className="text-sm text-gray-600">告诉我你的目标或困惑</p>
            </button>

            <button
              onClick={() => handleAIModeSelect('direct')}
              className="p-6 rounded-xl border-2 border-blue-200 bg-blue-50 hover:border-blue-400 transition-colors text-left"
            >
              <div className="flex items-center gap-3 mb-3">
                <Zap className="w-6 h-6 text-blue-500" />
                <span className="font-semibold">方式 B</span>
              </div>
              <p className="text-sm text-gray-600">让 AI 直接分析推荐</p>
            </button>
          </div>

          {selectedAIMode === 'goal' && (
            <div className="mb-6">
              <Textarea
                placeholder="描述你当前的问题或目标，例如：我想学习投资理财"
                value={userGoal}
                onChange={(e) => setUserGoal(e.target.value)}
                rows={2}
              />
            </div>
          )}

          <Button variant="outline" onClick={handleSkipAI} className="w-full">
            跳过，直接创建
          </Button>
        </div>
      </div>
    )
  }

  // ============ STEP 3: AI Analyzing ============
  if (step === 'ai-analyzing') {
    return (
      <div className="min-h-screen bg-white text-black p-6 md:p-12 flex items-center justify-center">
        <div className="text-center">
          <Sparkles className="w-12 h-12 mx-auto mb-4 text-purple-500 animate-pulse" />
          <h2 className="text-xl font-semibold mb-2">AI 分析中...</h2>
        </div>
      </div>
    )
  }

  // ============ STEP 4: Review AI Recommendations ============
  if (step === 'review') {
    return (
      <div className="min-h-screen bg-white text-black p-6 md:p-12">
        <div className="max-w-xl mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <Sparkles className="w-8 h-8 text-green-500" />
            <h1 className="text-2xl font-bold tracking-tight">AI 推荐结果</h1>
          </div>

          <Card className="mb-6 bg-green-50 border-green-200">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 mb-2">
                <Check className="w-5 h-5 text-green-600" />
                <span className="font-medium text-green-800">推荐已生成</span>
              </div>
              {aiRecommendation && (
                <>
                  <p className="text-sm text-gray-700">{aiRecommendation.reading_suggestion}</p>
                  {aiRecommendation.core_questions.length > 0 && (
                    <ul className="mt-3 space-y-1">
                      {aiRecommendation.core_questions.map((q, i) => (
                        <li key={i} className="text-sm">• {q}</li>
                      ))}
                    </ul>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button onClick={() => setStep('finalize')} className="flex-1 bg-green-600 hover:bg-green-700 text-white">
              采纳并继续
            </Button>
            <Button variant="outline" onClick={handleSkipAI} className="flex-1">
              修改
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // ============ STEP 5: Finalize ============
  return (
    <div className="min-h-screen bg-white text-black p-6 md:p-12">
      <div className="max-w-xl mx-auto">
        <button onClick={() => setStep('ai-mode')} className="text-sm text-gray-500 hover:text-black mb-4">
          ← 返回AI设置
        </button>

        <div className="flex items-center gap-3 mb-8">
          <BookOpen className="w-8 h-8" />
          <h1 className="text-2xl font-bold tracking-tight">完成设置</h1>
        </div>

        <Card className="mb-6 bg-gray-50">
          <CardContent className="pt-4">
            <p className="font-medium">{title}</p>
            {author && <p className="text-sm text-gray-500">{author}</p>}
          </CardContent>
        </Card>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Reading Mode */}
          <div className="space-y-3">
            <Label>阅读模式</Label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setReadingMode('skim')}
                className={`p-4 rounded-lg border-2 text-left transition-colors ${readingMode === 'skim' ? 'border-black bg-gray-50' : 'border-gray-200 hover:border-gray-400'}`}
              >
                <p className="font-medium">粗读</p>
                <p className="text-sm text-gray-500">随意推进</p>
              </button>
              <button
                type="button"
                onClick={() => setReadingMode('deep')}
                className={`p-4 rounded-lg border-2 text-left transition-colors ${readingMode === 'deep' ? 'border-black bg-gray-50' : 'border-gray-200 hover:border-gray-400'}`}
              >
                <p className="font-medium">精读</p>
                <p className="text-sm text-gray-500">AI 验证后推进</p>
              </button>
            </div>
          </div>

          {/* Genre */}
          <div className="space-y-3">
            <Label>书籍类型（可选）</Label>
            <div className="grid grid-cols-3 gap-2">
              {(Object.entries(BOOK_GENRE_LABELS) as [BookGenre, string][]).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setBookGenre(bookGenre === key ? '' : key)}
                  className={`p-3 rounded-lg border text-sm transition-colors ${bookGenre === key ? 'border-black bg-gray-50 font-medium' : 'border-gray-200 hover:border-gray-400'}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Motivation */}
          <div className="space-y-2">
            <Label htmlFor="motivation">读书动机（可选）</Label>
            <Textarea
              id="motivation"
              placeholder="为什么想读这本书？"
              value={motivation}
              onChange={(e) => setMotivation(e.target.value)}
              rows={2}
            />
          </div>

          <Button type="submit" disabled={isLoading || !title.trim()} className="w-full bg-black text-white hover:bg-gray-800">
            {isLoading ? '创建中...' : '创建'}
          </Button>
        </form>
      </div>
    </div>
  )
}
