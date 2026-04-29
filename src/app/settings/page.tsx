'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Key, Eye, EyeOff, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { createClient } from '@/lib/supabase/client'

export default function SettingsPage() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [apiKey, setApiKey] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/login'); return }
      setUserId(user.id)
      // Load existing API key
      supabase.from('profiles').select('openai_api_key').eq('id', user.id).single().then(({ data }) => {
        if (data?.openai_api_key) setApiKey(data.openai_api_key)
      })
    })
  }, [router])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId) return
    setIsSaving(true)
    setMessage(null)
    const supabase = createClient()
    const { error } = await supabase.from('profiles').upsert({
      id: userId,
      openai_api_key: apiKey.trim() || null,
    })
    setIsSaving(false)
    if (error) {
      setMessage({ type: 'error', text: '保存失败：' + error.message })
    } else {
      setMessage({ type: 'success', text: 'API Key 已保存' })
    }
  }

  return (
    <div className="min-h-screen bg-white text-black p-6 md:p-12">
      <div className="max-w-xl mx-auto">
        <Link href="/dashboard" className="inline-flex items-center text-sm text-gray-500 hover:text-black mb-6">
          <ArrowLeft className="w-4 h-4 mr-1" />返回书架
        </Link>

        <div className="flex items-center gap-3 mb-6">
          <Key className="w-6 h-6" />
          <h1 className="text-2xl font-bold tracking-tight">设置</h1>
        </div>

        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleSave} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="apiKey">OpenAI API Key (BYOK)</Label>
                <p className="text-sm text-gray-500">用于 AI 守门员功能验证精读成果。支持 GPT-4o 系列模型。</p>
                <div className="relative">
                  <Input
                    id="apiKey"
                    type={showKey ? 'text' : 'password'}
                    placeholder="sk-..."
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="pr-20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  {message && (
                    <p className={`text-sm ${message.type === 'success' ? 'text-green-600' : 'text-red-500'}`}>
                      {message.text}
                    </p>
                  )}
                </div>
                <Button type="submit" disabled={isSaving} className="bg-black text-white hover:bg-gray-800">
                  <Save className="w-4 h-4 mr-2" />
                  {isSaving ? '保存中...' : '保存设置'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}