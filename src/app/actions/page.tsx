import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Target, CheckCircle, Circle, BookOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { createClient, getUser } from '@/lib/supabase/server'
import type { ActionItem } from '@/types'

interface ActionItemWithBook extends ActionItem {
  books: { title: string; author: string | null } | null
}

export default async function ActionsPage() {
  const user = await getUser()
  if (!user) redirect('/login')

  const supabase = await createClient()

  const { data: allActions } = await supabase
    .from('action_items')
    .select('*, books(title, author)')
    .eq('user_id', user.id)
    .order('due_date', { ascending: true })

  const pending = allActions?.filter((a) => a.status !== 'completed') || []
  const completed = allActions?.filter((a) => a.status === 'completed') || []

  return (
    <div className="min-h-screen bg-white text-black p-6 md:p-12">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-1">
            <Target className="w-7 h-7" />
            <h1 className="text-2xl font-bold tracking-tight">全局行动中心</h1>
          </div>
          <p className="text-gray-500 ml-10 text-sm">
            所有书籍的行动转化，一目了然
          </p>
        </div>

        {/* 待办中 */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Circle className="w-5 h-5 text-gray-400" />
            <h2 className="text-lg font-semibold">待办中</h2>
            <Badge variant="secondary" className="ml-1">
              {pending.length}
            </Badge>
          </div>

          {pending.length === 0 ? (
            <div className="text-center py-10 border border-dashed border-gray-200 rounded-lg">
              <p className="text-gray-400">暂无待办行动</p>
              <p className="text-gray-300 text-sm mt-1">
                读完一本书后来这里设置你的行动清单
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {pending.map((item: ActionItemWithBook) => (
                <Card key={item.id}>
                  <CardContent className="pt-5 pb-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-800 mb-2">
                          {item.action_description}
                        </p>
                        <div className="flex items-center gap-2 flex-wrap">
                          {item.books && (
                            <Badge variant="outline" className="text-xs">
                              <BookOpen className="w-3 h-3 mr-1" />
                              {item.books.title}
                            </Badge>
                          )}
                          {item.due_date && (
                            <span className="text-xs text-gray-400">
                              截止：{item.due_date}
                            </span>
                          )}
                        </div>
                      </div>
                      <form action={`/api/actions/${item.id}/complete`} method="POST">
                        <Button
                          type="submit"
                          variant="outline"
                          size="sm"
                          className="shrink-0 text-green-600 border-green-200 hover:bg-green-50 hover:text-green-700"
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          完成
                        </Button>
                      </form>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* 已完成 */}
        {completed.length > 0 && (
          <div>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="completed">
                <AccordionTrigger className="flex items-center gap-2 px-1">
                  <CheckCircle className="w-5 h-5 text-gray-400" />
                  <h2 className="text-lg font-semibold text-gray-500">已完成</h2>
                  <Badge variant="secondary" className="ml-1">
                    {completed.length}
                  </Badge>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-3 pt-2">
                    {completed.map((item: ActionItemWithBook) => (
                      <Card key={item.id} className="bg-gray-50 border-gray-200 opacity-70">
                        <CardContent className="pt-5 pb-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-gray-500 line-through mb-2">
                                {item.action_description}
                              </p>
                              <div className="flex items-center gap-2 flex-wrap">
                                {item.books && (
                                  <Badge variant="outline" className="text-xs bg-transparent">
                                    <BookOpen className="w-3 h-3 mr-1" />
                                    {item.books.title}
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        )}
      </div>
    </div>
  )
}