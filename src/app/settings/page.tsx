'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Key, Eye, EyeOff, Save, Globe } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { createClient } from '@/lib/supabase/client'

const AI_PROVIDERS = [
  { id: 'openai', name: 'OpenAI', baseUrl: 'https://api.openai.com/v1', defaultModel: 'gpt-4o' },
  { id: 'azure', name: 'Azure OpenAI', baseUrl: '', defaultModel: 'gpt-4o' },
  { id: 'custom', name: '自定义 (OpenAI 兼容)', baseUrl: '', defaultModel: 'gpt-4o' },
]

const MODELS = [
  { id: 'gpt-4o', name: 'GPT-4o' },
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini' },
  { id: 'gpt-4-turbo', name: 'GPT-4 Turbo' },
  { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo' },
]

export default function SettingsPage() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [apiProvider, setApiProvider] = useState<string>('openai')
  const [apiBaseUrl, setApiBaseUrl] = useState<string>('https://api.openai.com/v1')
  const [apiKey, setApiKey] = useState('')
  const [aiModel, setAiModel] = useState<string>('gpt-4o')
  const [showKey, setShowKey] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/login'); return }
      setUserId(user.id)
      // Load existing settings
      supabase.from('profiles').select('*').eq('id', user.id).single().then(({ data }) => {
        if (data) {
          if (data.ai_provider) setApiProvider(data.ai_provider)
          if (data.ai_base_url) setApiBaseUrl(data.ai_base_url)
          if (data.openai_api_key) setApiKey(data.openai_api_key)
          if (data.ai_model) setAiModel(data.ai_model)
        }
      })
    })
  }, [router])

  const handleProviderChange = (provider: string) => {
    setApiProvider(provider)
    const preset = AI_PROVIDERS.find(p => p.id === provider)
    if (preset && preset.baseUrl) {
      setApiBaseUrl(preset.baseUrl)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId) return
    setIsSaving(true)
    setMessage(null)
    const supabase = createClient()
    const { error } = await supabase.from('profiles').upsert({
      id: userId,
      ai_provider: apiProvider,
      ai_base_url: apiBaseUrl.trim() || null,
      openai_api_key: apiKey.trim() || null,
      ai_model: aiModel,
    })
    setIsSaving(false)
    if (error) {
      setMessage({ type: 'error', text: '保存失败：' + error.message })
    } else {
      setMessage({ type: 'success', text: '设置已保存' })
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
              {/* AI Provider */}
              <div className="space-y-2">
                <Label>AI 提供商</Label>
                <div className="grid grid-cols-3 gap-2">
                  {AI_PROVIDERS.map((provider) => (
                    <button
                      key={provider.id}
                      type="button"
                      onClick={() => handleProviderChange(provider.id)}
                      className={`p-3 rounded-lg border text-sm transition-colors ${
                        apiProvider === provider.id
                          ? 'border-black bg-gray-50 font-medium'
                          : 'border-gray-200 hover:border-gray-400'
                      }`}
                    >
                      {provider.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* API Base URL */}
              <div className="space-y-2">
                <Label htmlFor="apiBaseUrl">API 地址</Label>
                <p className="text-sm text-gray-500">AI 服务的 API 端点地址</p>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="apiBaseUrl"
                    placeholder="https://api.openai.com/v1"
                    value={apiBaseUrl}
                    onChange={(e) => setApiBaseUrl(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* API Key */}
              <div className="space-y-2">
                <Label htmlFor="apiKey">API Key (BYOK)</Label>
                <p className="text-sm text-gray-500">用于 AI 守门员和预读功能验证精读成果</p>
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

              {/* Model Selection */}
              <div className="space-y-2">
                <Label>AI 模型</Label>
                <div className="grid grid-cols-2 gap-2">
                  {MODELS.map((model) => (
                    <button
                      key={model.id}
                      type="button"
                      onClick={() => setAiModel(model.id)}
                      className={`p-3 rounded-lg border text-sm transition-colors ${
                        aiModel === model.id
                          ? 'border-black bg-gray-50 font-medium'
                          : 'border-gray-200 hover:border-gray-400'
                      }`}
                    >
                      {model.name}
                    </button>
                  ))}
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
