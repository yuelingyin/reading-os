'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export function DeleteBookButton({ bookId }: { bookId: string }) {
  const router = useRouter()
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    if (!confirm('确定要删除这本书吗？此操作不可恢复。')) return

    setIsDeleting(true)
    const supabase = createClient()

    // Delete related records first
    await Promise.all([
      supabase.from('chapter_reviews').delete().eq('book_id', bookId),
      supabase.from('action_items').delete().eq('book_id', bookId),
      supabase.from('extended_reading').delete().eq('book_id', bookId),
    ])

    // Delete the book
    await supabase.from('books').delete().eq('id', bookId)

    setIsDeleting(false)
    router.refresh()
  }

  return (
    <button
      onClick={handleDelete}
      disabled={isDeleting}
      className="p-1.5 text-gray-400 hover:text-red-600 transition-colors disabled:opacity-50"
      title="删除书籍"
    >
      <Trash2 className="w-4 h-4" />
    </button>
  )
}