import Link from 'next/link'
import { redirect } from 'next/navigation'
import { BookOpen, Plus, Target, CheckCircle, Flame, TrendingUp, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { createClient, getUser } from '@/lib/supabase/server'
import type { Book, BookStatus, Category } from '@/types'

const statusMap: Record<BookStatus, { label: string; className: string }> = {
  'to-read': { label: '待阅读', className: 'bg-gray-100 text-gray-800' },
  'in-progress': { label: '阅读中', className: 'bg-black text-white' },
  completed: { label: '已读完', className: 'bg-gray-400 text-white' },
}

export default async function DashboardPage() {
  const user = await getUser()
  if (!user) redirect('/login')
  const supabase = await createClient()

  // Fetch all data in parallel
  const [{ data: books }, { data: categories }, { data: actionItems }, { data: reviews }] = await Promise.all([
    supabase.from('books').select('*, categories(*)').eq('user_id', user.id).order('created_at', { ascending: false }),
    supabase.from('categories').select('*').eq('user_id', user.id).order('name'),
    supabase.from('action_items').select('*').eq('user_id', user.id),
    supabase.from('chapter_reviews').select('created_at').eq('user_id', user.id).order('created_at', { ascending: false }),
  ])

  // Calculate statistics
  const now = new Date()
  const thisMonth = now.getMonth()
  const thisYear = now.getFullYear()
  const firstDayOfMonth = new Date(thisYear, thisMonth, 1)

  const booksReadThisMonth = books?.filter(b => {
    if (b.status !== 'completed') return false
    const updated = new Date(b.updated_at)
    return updated >= firstDayOfMonth
  }).length || 0

  const booksInProgress = books?.filter(b => b.status === 'in-progress').length || 0
  const totalBooks = books?.length || 0

  const completedActions = actionItems?.filter(a => a.status === 'completed').length || 0
  const totalActions = actionItems?.length || 0
  const actionCompletionRate = totalActions > 0 ? Math.round((completedActions / totalActions) * 100) : 0

  // Calculate reading streak (consecutive days with reviews)
  let readingStreak = 0
  if (reviews && reviews.length > 0) {
    const reviewDates = [...new Set(reviews.map(r => r.created_at.split('T')[0]))].sort().reverse()
    const today = now.toISOString().split('T')[0]
    const yesterday = new Date(now.getTime() - 86400000).toISOString().split('T')[0]

    if (reviewDates[0] === today || reviewDates[0] === yesterday) {
      readingStreak = 1
      for (let i = 1; i < reviewDates.length; i++) {
        const prev = new Date(reviewDates[i - 1])
        const curr = new Date(reviewDates[i])
        const diff = (prev.getTime() - curr.getTime()) / 86400000
        if (diff === 1) readingStreak++
        else break
      }
    }
  }

  return (
    <div className="min-h-screen bg-white text-black p-6 md:p-12">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <BookOpen className="w-8 h-8" />
            <h1 className="text-2xl font-bold tracking-tight">Reading OS</h1>
          </div>
          <div className="flex items-center gap-2">
            <a href="/api/export?type=books">
              <Button variant="outline" size="sm"><Download className="w-4 h-4 mr-1" />导出书单</Button>
            </a>
            <a href="/api/export?type=actions">
              <Button variant="outline" size="sm"><Download className="w-4 h-4 mr-1" />导出行动</Button>
            </a>
            <Link href="/books/new">
              <Button className="bg-black text-white hover:bg-gray-800"><Plus className="w-4 h-4 mr-2" />发起新阅读</Button>
            </Link>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-4 h-4 text-gray-400" />
                <span className="text-xs text-gray-500">本月读完</span>
              </div>
              <p className="text-2xl font-bold">{booksReadThisMonth}</p>
              <p className="text-xs text-gray-400">本书</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 mb-1">
                <BookOpen className="w-4 h-4 text-gray-400" />
                <span className="text-xs text-gray-500">正在阅读</span>
              </div>
              <p className="text-2xl font-bold">{booksInProgress}</p>
              <p className="text-xs text-gray-400">本书</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 mb-1">
                <Target className="w-4 h-4 text-gray-400" />
                <span className="text-xs text-gray-500">行动完成率</span>
              </div>
              <p className="text-2xl font-bold">{actionCompletionRate}%</p>
              <p className="text-xs text-gray-400">{completedActions}/{totalActions}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 mb-1">
                <Flame className="w-4 h-4 text-orange-500" />
                <span className="text-xs text-gray-500">阅读连续</span>
              </div>
              <p className="text-2xl font-bold">{readingStreak}</p>
              <p className="text-xs text-gray-400">天</p>
            </CardContent>
          </Card>
        </div>

        {/* Category Filter */}
        {categories && categories.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            <Link href="/dashboard">
              <Button variant="outline" size="sm" className="rounded-full">全部</Button>
            </Link>
            {categories.map((cat: Category) => (
              <Link key={cat.id} href={`/dashboard?category=${cat.id}`}>
                <Button variant="outline" size="sm" className="rounded-full">{cat.name}</Button>
              </Link>
            ))}
            <Link href="/categories">
              <Button variant="ghost" size="sm" className="text-gray-400">管理分类</Button>
            </Link>
          </div>
        )}

        <Separator className="mb-8" />

        {/* Books Grid */}
        {!books || books.length === 0 ? (
          <div className="text-center py-24 border border-dashed border-gray-200 rounded-lg">
            <p className="text-gray-500">当前无阅读计划</p>
            <p className="text-sm text-gray-400 mt-1">开始你的第一本阅读吧</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {books.map((book: Book) => (
              <Card key={book.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex gap-3">
                    {book.cover_url ? (
                      <img src={book.cover_url} alt="" className="w-12 h-16 object-cover rounded" />
                    ) : (
                      <div className="w-12 h-16 bg-gray-100 rounded flex items-center justify-center">
                        <BookOpen className="w-5 h-5 text-gray-300" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h2 className="text-lg font-semibold truncate">{book.title}</h2>
                      {book.author && <p className="text-sm text-gray-500 truncate">{book.author}</p>}
                      <div className="flex items-center gap-2 mt-1">
                        <Badge className={statusMap[book.status].className}>{statusMap[book.status].label}</Badge>
                        {book.categories && <Badge variant="outline">{book.categories.name}</Badge>}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {book.core_questions?.slice(0, 2).map((q, i) => (
                    <p key={i} className="text-sm text-gray-700 truncate">Q{i+1}. {q}</p>
                  ))}
                </CardContent>
                <CardFooter className="pt-0">
                  <Link href={`/books/${book.id}`} className="w-full">
                    <Button variant="outline" className="w-full">进入复盘</Button>
                  </Link>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
