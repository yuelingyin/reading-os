'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { BookOpen, Target, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

export function MainNav() {
  const pathname = usePathname()
  const router = useRouter()
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setIsLoggedIn(!!data.user)
    })
  }, [pathname])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  const isBookShelf = pathname === '/dashboard' || pathname.startsWith('/books')
  const isActionCenter = pathname === '/actions'

  if (isLoggedIn === null) {
    return (
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-6 h-14 flex items-center justify-end">
          <div className="w-20 h-5 bg-gray-100 rounded animate-pulse" />
        </div>
      </nav>
    )
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-100">
      <div className="max-w-4xl mx-auto px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-1">
          {isLoggedIn && (
            <>
              <Link
                href="/dashboard"
                className={cn(
                  'flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors',
                  isBookShelf
                    ? 'font-bold text-black'
                    : 'font-medium text-gray-500 hover:text-black hover:bg-gray-50'
                )}
              >
                <BookOpen className="w-4 h-4" />
                我的书架
              </Link>
              <Link
                href="/actions"
                className={cn(
                  'flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors',
                  isActionCenter
                    ? 'font-bold text-black'
                    : 'font-medium text-gray-500 hover:text-black hover:bg-gray-50'
                )}
              >
                <Target className="w-4 h-4" />
                行动中心
              </Link>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          {isLoggedIn ? (
            <>
              <Link
                href="/books/new"
                className="text-sm text-gray-400 hover:text-black transition-colors"
              >
                + 新建
              </Link>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1 text-sm text-gray-400 hover:text-black transition-colors ml-2"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </>
          ) : (
            <Link href="/login">
              <Button size="sm" variant="outline" className="text-sm">
                登录 / 注册
              </Button>
            </Link>
          )}
        </div>
      </div>
    </nav>
  )
}