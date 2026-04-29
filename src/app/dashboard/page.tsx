import Link from 'next/link'
import { redirect } from 'next/navigation'
import { BookOpen, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { createClient, getUser } from '@/lib/supabase/server'
import type { Book, BookStatus } from '@/types'

const statusMap: Record<BookStatus, { label: string; className: string }> = {
  'to-read': { label: '待阅读', className: 'bg-gray-100 text-gray-800' },
  'in-progress': { label: '阅读中', className: 'bg-black text-white' },
  completed: { label: '已读完', className: 'bg-gray-400 text-white' },
}

export default async function DashboardPage() {
  const user = await getUser()
  if (!user) redirect('/login')
  const supabase = await createClient()
  const { data: books } = await supabase.from('books').select('*').eq('user_id', user.id).order('created_at', { ascending: false })

  return (
    <div className="min-h-screen bg-white text-black p-6 md:p-12">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-3">
            <BookOpen className="w-8 h-8" />
            <h1 className="text-2xl font-bold tracking-tight">Reading OS</h1>
          </div>
          <Link href="/books/new">
            <Button className="bg-black text-white hover:bg-gray-800"><Plus className="w-4 h-4 mr-2" />发起新阅读</Button>
          </Link>
        </div>
        {!books || books.length === 0 ? (
          <div className="text-center py-24 border border-dashed border-gray-200 rounded-lg">
            <p className="text-gray-500">当前无阅读计划</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {books.map((book: Book) => (
              <Card key={book.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h2 className="text-lg font-semibold">{book.title}</h2>
                      {book.author && <p className="text-sm text-gray-500">{book.author}</p>}
                    </div>
                    <Badge className={statusMap[book.status].className}>{statusMap[book.status].label}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {book.core_questions?.map((q, i) => (
                    <p key={i} className="text-sm text-gray-700">Q{i+1}. {q}</p>
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