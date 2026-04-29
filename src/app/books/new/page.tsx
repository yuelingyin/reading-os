'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { BookOpen, Plus, X, Search, Loader2, Sparkles, ArrowRight, Check, MessageCircle, Zap } from 'lucide-react'
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

type Step = 'search' | 'ai-mode' | 'ai-analyzing' | 'review' | 'finalize'

export default function NewBookPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('search')
  const [isLoading, setIsLoading] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [categories, setCategories] = useState<Category[]>([])

  // Book info (from search or manual)
  const [title, setTitle] = useState('')
  const [author, setAuthor] = useState('')
  const [coverUrl, setCoverUrl] = useState('')

  // Search state
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showResults, setShowResults] = useState(false)

  // AI pre-read state
  const [selectedAIMode, setSelectedAIMode] = useState<'goal' | 'direct' | null>(null)
  const [userGoal, setUserGoal] = useState('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [aiRecommendation, setAiRecommendation] = useState<AIRecommendation | null>(null)

  // Form state (filled from AI or manual)
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

  const selectBook = (book: SearchResult) => {
    setTitle(book.title)
    setAuthor(book.authors.join(', '))
    setCoverUrl(book.coverUrl || '')
    setSearchQuery('')
    setSearchResults([])
    setShowResults(false)
    setStep('ai-mode')
  }

  const handleManualEntry = () => {
    setStep('ai-mode')
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
      alert(result.error || 'AI 分析失败，请重试或选择手动输入')
      setStep('ai-mode')
    }
    setIsAnalyzing(false)
  }

  const handleAcceptRecommendations = () => {
    setStep('finalize')
  }

  const handleModifyRecommendations = () => {
    setStep('finalize')
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

  // ============ STEP 1: Search ============
  if (step === 'search') {
    return (
      <div className="min-h-screen bg-white text-black p-6 md:p-12">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <BookOpen className="w-8 h-8" />
            <h1 className="text-2xl font-bold tracking-tight">发起新阅读项目</h1>
          </div>

          <Card className="mb-6 border-2 border-dashed border-gray-200">
            <CardContent className="pt-6">
              <div className="relative">
                <Label>搜索书籍</Label>
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
                        {book.coverUrl ? (
                          <img src={book.coverUrl} alt="" className="w-10 h-14 object-cover rounded" />
                        ) : (
                          <div className="w-10 h-14 bg-gray-100 rounded flex items-center justify-center">
                            <BookOpen className="w-4 h-4 text-gray-400" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{book.title}</p>
                          <p className="text-xs text-gray-500 truncate">{book.authors.join(', ')}</p>
                          <p className="text-xs text-gray-300">{book.source}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-2">支持 Google Books、Open Library、豆瓣 多源搜索</p>
            </CardContent>
          </Card>

          <div className="text-center">
            <p className="text-gray-500 mb-4">或</p>
            <Button onClick={handleManualEntry} variant="outline">
              <Plus className="w-4 h-4 mr-2" />
              手动输入书名
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
        <div className="max-w-2xl mx-auto">
          <button onClick={() => setStep('search')} className="text-sm text-gray-500 hover:text-black mb-4">
            ← 重新搜索
          </button>

          <div className="flex items-center gap-3 mb-8">
            <Sparkles className="w-8 h-8 text-purple-500" />
            <h1 className="text-2xl font-bold tracking-tight">AI 预读助手</h1>
          </div>

          {/* Selected Book */}
          <Card className="mb-6 bg-gray-50">
            <CardContent className="pt-4 flex items-center gap-4">
              {coverUrl ? (
                <img src={coverUrl} alt="" className="w-12 h-16 object-cover rounded" />
              ) : (
                <div className="w-12 h-16 bg-gray-200 rounded flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-gray-400" />
                </div>
              )}
              <div>
                <h2 className="font-semibold">{title}</h2>
                {author && <p className="text-sm text-gray-500">{author}</p>}
              </div>
            </CardContent>
          </Card>

          <p className="text-gray-600 mb-6">请选择 AI 分析方式：</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Method A */}
            <button
              onClick={() => handleAIModeSelect('goal')}
              className="p-6 rounded-xl border-2 border-purple-200 bg-purple-50 hover:border-purple-400 transition-colors text-left"
            >
              <div className="flex items-center gap-3 mb-3">
                <MessageCircle className="w-6 h-6 text-purple-500" />
                <span className="font-semibold">方案 A</span>
              </div>
              <p className="text-sm text-gray-600 mb-3">告诉 AI 你当前的问题或目标</p>
              <p className="text-xs text-gray-400">AI 会判断这本书是否能帮你，并推荐核心问题</p>
            </button>

            {/* Method B */}
            <button
              onClick={() => handleAIModeSelect('direct')}
              className="p-6 rounded-xl border-2 border-blue-200 bg-blue-50 hover:border-blue-400 transition-colors text-left"
            >
              <div className="flex items-center gap-3 mb-3">
                <Zap className="w-6 h-6 text-blue-500" />
                <span className="font-semibold">方案 B</span>
              </div>
              <p className="text-sm text-gray-600 mb-3">让 AI 直接分析书籍内容</p>
              <p className="text-xs text-gray-400">AI 会深入分析书籍，推荐核心问题和阅读方向</p>
            </button>
          </div>

          {/* Goal Input (for Method A) */}
          {selectedAIMode === 'goal' && (
            <div className="mt-6">
              <Textarea
                placeholder="描述你当前的问题或目标，例如：我想学习投资理财，但不知道从何开始"
                value={userGoal}
                onChange={(e) => setUserGoal(e.target.value)}
                rows={3}
                className="text-sm"
              />
            </div>
          )}

          <div className="mt-6 text-center">
            <Button variant="outline" onClick={() => setStep('finalize')}>
              跳过 AI 分析，直接手动填写
            </Button>
          </div>
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
          <h2 className="text-xl font-semibold mb-2">AI 正在分析中...</h2>
          <p className="text-gray-500">
            {selectedAIMode === 'goal' ? '根据你的目标分析书籍' : '深入分析书籍内容'}
          </p>
        </div>
      </div>
    )
  }

  // ============ STEP 4: Review AI Recommendations ============
  if (step === 'review') {
    return (
      <div className="min-h-screen bg-white text-black p-6 md:p-12">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <Sparkles className="w-8 h-8 text-green-500" />
            <h1 className="text-2xl font-bold tracking-tight">AI 推荐结果</h1>
          </div>

          {/* Selected Book */}
          <Card className="mb-6 bg-gray-50">
            <CardContent className="pt-4 flex items-center gap-4">
              {coverUrl ? (
                <img src={coverUrl} alt="" className="w-12 h-16 object-cover rounded" />
              ) : (
                <div className="w-12 h-16 bg-gray-200 rounded flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-gray-400" />
                </div>
              )}
              <div>
                <h2 className="font-semibold">{title}</h2>
                {author && <p className="text-sm text-gray-500">{author}</p>}
              </div>
            </CardContent>
          </Card>

          {aiRecommendation && (
            <>
              {/* Reading Suggestion */}
              <Card className="mb-6 bg-green-50 border-green-200">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Check className="w-5 h-5 text-green-600" />
                    <span className="font-medium text-green-800">阅读建议</span>
                  </div>
                  <p className="text-sm text-gray-700">{aiRecommendation.reading_suggestion}</p>
                  <p className="text-xs text-gray-500 mt-2">目标读者：{aiRecommendation.target_audience}</p>
                </CardContent>
              </Card>

              {/* Suggested Genre */}
              <Card className="mb-6">
                <CardContent className="pt-4">
                  <Label className="text-sm text-gray-500">推荐分类</Label>
                  <div className="mt-2 flex items-center gap-2">
                    <Badge variant="outline">{BOOK_GENRE_LABELS[aiRecommendation.suggested_genre]}</Badge>
                    <span className="text-xs text-gray-400">（你可以在下一步修改）</span>
                  </div>
                </CardContent>
              </Card>

              {/* Core Questions */}
              <Card className="mb-6">
                <CardContent className="pt-4">
                  <Label className="text-sm text-gray-500">核心问题</Label>
                  <ul className="mt-3 space-y-2">
                    {aiRecommendation.core_questions.map((q, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <Badge variant="secondary" className="shrink-0">Q{i+1}</Badge>
                        <span className="text-sm">{q}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </>
          )}

          <div className="flex gap-4">
            <Button onClick={handleAcceptRecommendations} className="flex-1 bg-green-600 hover:bg-green-700 text-white">
              <Check className="w-4 h-4 mr-2" />
              采纳推荐，继续
            </Button>
            <Button onClick={handleModifyRecommendations} variant="outline" className="flex-1">
              <ArrowRight className="w-4 h-4 mr-2" />
              修改建议
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // ============ STEP 5: Finalize (Reading Mode, Genre, Motivation, etc.) ============
  return (
    <div className="min-h-screen bg-white text-black p-6 md:p-12">
      <div className="max-w-2xl mx-auto">
        <button onClick={() => setStep('review')} className="text-sm text-gray-500 hover:text-black mb-4">
          ← 返回AI推荐
        </button>

        <div className="flex items-center gap-3 mb-8">
          <BookOpen className="w-8 h-8" />
          <h1 className="text-2xl font-bold tracking-tight">完成阅读项目设置</h1>
        </div>

        {/* Selected Book */}
        <Card className="mb-6 bg-gray-50">
          <CardContent className="pt-4 flex items-center gap-4">
            {coverUrl ? (
              <img src={coverUrl} alt="" className="w-12 h-16 object-cover rounded" />
            ) : (
              <div className="w-12 h-16 bg-gray-200 rounded flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-gray-400" />
              </div>
            )}
            <div>
              <h2 className="font-semibold">{title}</h2>
              {author && <p className="text-sm text-gray-500">{author}</p>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Reading Mode Selection */}
              <div className="space-y-3">
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
              </div>

              {/* Book Genre Selection */}
              <div className="space-y-3">
                <Label>书籍类型 <span className="text-red-500">*</span></Label>
                <div className="grid grid-cols-3 gap-2">
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

              {/* Category Selection */}
              {categories.length > 0 && (
                <div className="space-y-3">
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

              {/* Motivation */}
              <div className="space-y-2">
                <Label htmlFor="motivation">读书动机 <span className="text-red-500">*</span></Label>
                <p className="text-sm text-gray-500">我最近遇到了什么痛点？为什么要读这本？</p>
                <Textarea
                  id="motivation"
                  placeholder="描述你当前的困惑或想解决的问题..."
                  value={motivation}
                  onChange={(e) => setMotivation(e.target.value)}
                  rows={3}
                  required
                />
              </div>

              {/* Core Questions */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>核心诉求</Label>
                  {coreQuestions.length < 3 && (
                    <Button type="button" variant="outline" size="sm" onClick={() => setCoreQuestions([...coreQuestions, ''])}>
                      <Plus className="w-4 h-4 mr-1" />添加
                    </Button>
                  )}
                </div>
                {coreQuestions.map((q, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Badge variant="secondary" className="shrink-0">Q{i+1}</Badge>
                    <Input
                      placeholder={`问题 ${i+1}`}
                      value={q}
                      onChange={(e) => { const u = [...coreQuestions]; u[i] = e.target.value; setCoreQuestions(u) }}
                    />
                    {coreQuestions.length > 1 && (
                      <Button type="button" variant="ghost" size="icon" onClick={() => setCoreQuestions(coreQuestions.filter((_, j) => j !== i))}>
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>

              <Separator />

              <div className="flex justify-end">
                <Button type="submit" disabled={isLoading || !title.trim() || !motivation.trim() || !bookGenre} className="bg-black text-white hover:bg-gray-800">
                  {isLoading ? '创建中...' : '确认立项'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
