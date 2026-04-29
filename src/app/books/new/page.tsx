'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { BookOpen, Loader2, Sparkles, ArrowRight, Check, MessageCircle, Zap, BookMarked } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'
import { analyzeBookForUser } from '@/lib/book-actions'
import { APIConfigBanner } from '@/components/api-config-banner'
import type { Category, ReadingMode, BookGenre, AIRecommendation } from '@/types'
import { READING_MODE_LABELS, BOOK_GENRE_LABELS } from '@/types'

type Step = 'title' | 'confirm' | 'ai-mode' | 'ai-analyzing' | 'finalize'

interface BookOption {
  title: string
  author: string
  description?: string
}

export default function NewBookPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('title')
  const [isLoading, setIsLoading] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [categories, setCategories] = useState<Category[]>([])

  // Book info
  const [title, setTitle] = useState('')
  const [author, setAuthor] = useState('')
  const [coverUrl, setCoverUrl] = useState('')

  // AI book options
  const [bookOptions, setBookOptions] = useState<BookOption[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)

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

  const handleSearchBook = async () => {
    if (!title.trim()) return
    setIsSearching(true)
    setSearchError(null)
    setBookOptions([])

    try {
      // Call AI to find matching books by title
      const result = await analyzeBookForUser(title.trim(), undefined, 'FIND_BOOK_OPTIONS')

      if (result.success && result.recommendation) {
        // AI returns options in core_questions or reading_suggestion
        // Parse AI response to get book options
        const suggestion = result.recommendation.reading_suggestion || ''
        const targetAudience = result.recommendation.target_audience || ''

        // Try to parse AI response for book options
        const options: BookOption[] = []

        // Check if suggestion contains book info
        if (suggestion.includes('《')) {
          const matches = suggestion.match(/《([^》]+)》[^《]*?(?:作者[：:]\s*([^\n，,。]+))?/g)
          if (matches) {
            matches.forEach(m => {
              const titleMatch = m.match(/《([^》]+)》/)
              const authorMatch = m.match(/作者[：:]\s*([^\n，,。]+)/)
              if (titleMatch) {
                options.push({
                  title: titleMatch[1],
                  author: authorMatch ? authorMatch[1].trim() : '作者未知',
                  description: m.slice(0, 100),
                })
              }
            })
          }
        }

        // Fallback: if no options parsed, use target_audience
        if (options.length === 0 && targetAudience) {
          options.push({
            title: title.trim(),
            author: targetAudience.split('、')[0] || '作者未知',
            description: targetAudience,
          })
        }

        // Final fallback
        if (options.length === 0) {
          options.push({
            title: title.trim(),
            author: '作者未知，请确认',
            description: '请从以下选项中选择，或手动修改',
          })
        }

        setBookOptions(options)
        setStep('confirm')
      } else {
        setSearchError(result.error || '无法找到匹配的书籍')
        setBookOptions([{
          title: title.trim(),
          author: '',
          description: result.error || '请手动确认书名和作者',
        }])
        setStep('confirm')
      }
    } catch (e: any) {
      setSearchError(e.message || '搜索失败')
      setBookOptions([{
        title: title.trim(),
        author: '',
        description: '搜索失败，请手动确认',
      }])
      setStep('confirm')
    }
    setIsSearching(false)
  }

  const selectBookOption = (option: BookOption) => {
    setTitle(option.title)
    setAuthor(option.author)
    setCoverUrl('')
    setStep('ai-mode')
  }

  const handleManualConfirm = () => {
    if (!title.trim()) return
    setBookOptions([{ title: title.trim(), author: author || '' }])
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
      author || undefined,
      mode === 'goal' ? userGoal : undefined
    )

    if (result.success && result.recommendation) {
      setAiRecommendation(result.recommendation)
      if (result.recommendation.core_questions.length > 0) {
        setCoreQuestions(result.recommendation.core_questions)
      }
      if (result.recommendation.suggested_genre) {
        setBookGenre(result.recommendation.suggested_genre)
      }
      setStep('finalize')
    } else {
      alert(result.error || 'AI 分析失败')
      setStep('ai-mode')
    }
    setIsAnalyzing(false)
  }

  const handleSkipAI = () => {
    setStep('finalize')
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

  // ============ STEP 1: Enter Title ============
  if (step === 'title') {
    return (
      <div className="min-h-screen bg-white text-black p-6 md:p-12">
        <div className="max-w-xl mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <BookMarked className="w-8 h-8" />
            <h1 className="text-2xl font-bold tracking-tight">记录一本书</h1>
          </div>

          <APIConfigBanner />

          <Card className="mb-6">
            <CardContent className="pt-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">书名</Label>
                <Input
                  id="title"
                  placeholder="输入书名，例如：天生不同"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="text-lg"
                  onKeyDown={(e) => e.key === 'Enter' && handleSearchBook()}
                />
              </div>

              {searchError && (
                <p className="text-sm text-red-500">{searchError}</p>
              )}
            </CardContent>
          </Card>

          <Button
            onClick={handleSearchBook}
            disabled={!title.trim() || isSearching}
            className="w-full bg-black text-white hover:bg-gray-800"
          >
            {isSearching ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                AI 确认中...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                AI 确认书名和作者
              </>
            )}
          </Button>

          <div className="mt-4 text-center">
            <button
              onClick={handleManualConfirm}
              className="text-sm text-gray-500 hover:text-black"
            >
              跳过，直接手动输入
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ============ STEP 2: Confirm Book ============
  if (step === 'confirm') {
    return (
      <div className="min-h-screen bg-white text-black p-6 md:p-12">
        <div className="max-w-xl mx-auto">
          <button onClick={() => setStep('title')} className="text-sm text-gray-500 hover:text-black mb-4">
            ← 返回修改书名
          </button>

          <div className="flex items-center gap-3 mb-8">
            <Check className="w-8 h-8 text-green-500" />
            <h1 className="text-2xl font-bold tracking-tight">确认书籍信息</h1>
          </div>

          {bookOptions.length > 0 && (
            <div className="space-y-3 mb-6">
              <p className="text-gray-600">请确认是否是以下书籍：</p>
              {bookOptions.map((option, i) => (
                <button
                  key={i}
                  onClick={() => selectBookOption(option)}
                  className="w-full p-4 rounded-lg border-2 border-gray-200 hover:border-green-400 transition-colors text-left"
                >
                  <p className="font-semibold text-lg">{option.title}</p>
                  <p className="text-gray-500">{option.author || '作者未知'}</p>
                  {option.description && (
                    <p className="text-xs text-gray-400 mt-1">{option.description}</p>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Manual edit */}
          <div className="border-t pt-4 mt-4">
            <p className="text-sm text-gray-500 mb-3">或者手动修改：</p>
            <div className="space-y-2">
              <Input
                placeholder="书名"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
              <Input
                placeholder="作者"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
              />
            </div>
          </div>

          <Button onClick={handleManualConfirm} className="w-full mt-4 bg-black text-white hover:bg-gray-800">
            确认并继续
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    )
  }

  // ============ STEP 3: Choose AI Mode ============
  if (step === 'ai-mode') {
    return (
      <div className="min-h-screen bg-white text-black p-6 md:p-12">
        <div className="max-w-xl mx-auto">
          <button onClick={() => setStep('confirm')} className="text-sm text-gray-500 hover:text-black mb-4">
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

          <Button variant="outline" onClick={handleSkipAI} className="w-full">
            跳过，直接创建
          </Button>
        </div>
      </div>
    )
  }

  // ============ STEP 4: AI Analyzing ============
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

        {aiRecommendation && (
          <Card className="mb-6 bg-green-50 border-green-200">
            <CardContent className="pt-4">
              <p className="text-sm text-green-700">{aiRecommendation.reading_suggestion}</p>
            </CardContent>
          </Card>
        )}

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

          <Button type="submit" disabled={isLoading || !title.trim()} className="w-full bg-black text-white hover:bg-gray-800">
            {isLoading ? '创建中...' : '创建'}
          </Button>
        </form>
      </div>
    </div>
  )
}
