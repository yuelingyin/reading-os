'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Plus, X } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'
import type { Category } from '@/types'

const COLORS = [
  'bg-red-100 text-red-700 border-red-200',
  'bg-orange-100 text-orange-700 border-orange-200',
  'bg-amber-100 text-amber-700 border-amber-200',
  'bg-green-100 text-green-700 border-green-200',
  'bg-teal-100 text-teal-700 border-teal-200',
  'bg-blue-100 text-blue-700 border-blue-200',
  'bg-indigo-100 text-indigo-700 border-indigo-200',
  'bg-purple-100 text-purple-700 border-purple-200',
  'bg-pink-100 text-pink-700 border-pink-200',
]

export default function CategoriesPage() {
  const router = useRouter()
  const [categories, setCategories] = useState<Category[]>([])
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState(COLORS[0])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/login'); return }
      supabase.from('categories').select('*').eq('user_id', user.id).order('name').then(({ data }) => {
        if (data) setCategories(data)
      })
    })
  }, [router])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName.trim()) return
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setIsLoading(true)
    const { data, error } = await supabase.from('categories').insert({
      user_id: user.id,
      name: newName.trim(),
      color: newColor,
    }).select()
    setIsLoading(false)
    if (!error && data) {
      setCategories([...categories, ...data])
      setNewName('')
      setNewColor(COLORS[0])
    }
  }

  const handleDelete = async (id: string) => {
    const supabase = createClient()
    await supabase.from('categories').delete().eq('id', id)
    setCategories(categories.filter(c => c.id !== id))
  }

  return (
    <div className="min-h-screen bg-white text-black p-6 md:p-12">
      <div className="max-w-2xl mx-auto">
        <Link href="/dashboard" className="inline-flex items-center text-sm text-gray-500 hover:text-black mb-6">
          <ArrowLeft className="w-4 h-4 mr-1" />返回书架
        </Link>
        <h1 className="text-2xl font-bold tracking-tight mb-6">书籍分类</h1>

        <Card className="mb-6">
          <CardContent className="pt-6">
            <form onSubmit={handleAdd} className="flex items-end gap-3">
              <div className="flex-1 space-y-1">
                <Label htmlFor="name">新分类名称</Label>
                <Input id="name" placeholder="例如：心理学" value={newName} onChange={(e) => setNewName(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>颜色</Label>
                <div className="flex gap-1">
                  {COLORS.slice(0, 5).map((c, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setNewColor(c)}
                      className={`w-6 h-6 rounded-full border-2 ${c.split(' ')[0]} ${newColor === c ? 'border-gray-800' : 'border-transparent'}`}
                    />
                  ))}
                </div>
              </div>
              <Button type="submit" disabled={isLoading || !newName.trim()} className="bg-black text-white hover:bg-gray-800">
                <Plus className="w-4 h-4" />
              </Button>
            </form>
          </CardContent>
        </Card>

        {categories.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-gray-200 rounded-lg">
            <p className="text-gray-400">暂无分类</p>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <div key={cat.id} className={`flex items-center gap-2 px-3 py-2 rounded-full border ${cat.color}`}>
                <span className="text-sm font-medium">{cat.name}</span>
                <button onClick={() => handleDelete(cat.id)} className="hover:opacity-70">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
