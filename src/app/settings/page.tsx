'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Key, Eye, EyeOff, Save, Globe, RefreshCw, Loader2, CheckCircle, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'

const AI_PROVIDERS = [
  {
    id: 'openai',
    name: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'],
  },
  {
    id: 'google',
    name: 'Google Gemini',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    models: ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-1.0-pro'],
  },
  {
    id: 'azure',
    name: 'Azure OpenAI',
    baseUrl: '',
    models: ['gpt-4o', 'gpt-4-turbo', 'gpt-35-turbo'],
  },
  {
    id: 'minimax',
    name: 'MiniMax',
    baseUrl: 'https://minnimax.chat/v1',
    models: ['abab6.5s', 'abab6.5', 'abab6'],
  },
  {
    id: 'custom',
    name: '自定义 API',
    baseUrl: '',
    models: [],
  },
]

const SETTINGS_KEY = 'reading-os-settings'

interface Settings {
  apiProvider: string
  apiBaseUrl: string
  apiKey: string
  aiModel: string
}

export default function SettingsPage() {
  const router = useRouter()
  const [apiProvider, setApiProvider] = useState<string>('openai')
  const [apiBaseUrl, setApiBaseUrl] = useState<string>('https://api.openai.com/v1')
  const [apiKey, setApiKey] = useState('')
  const [aiModel, setAiModel] = useState<string>('')
  const [customModel, setCustomModel] = useState<string>('')
  const [showKey, setShowKey] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isFetchingModels, setIsFetchingModels] = useState(false)
  const [isTestingConnection, setIsTestingConnection] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [availableModels, setAvailableModels] = useState<string[]>([])
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [connectionMessage, setConnectionMessage] = useState<string>('')
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const currentProvider = AI_PROVIDERS.find(p => p.id === apiProvider)

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(SETTINGS_KEY)
    if (stored) {
      try {
        const settings: Settings = JSON.parse(stored)
        setApiProvider(settings.apiProvider || 'openai')
        setApiBaseUrl(settings.apiBaseUrl || 'https://api.openai.com/v1')
        setApiKey(settings.apiKey || '')
        const model = settings.aiModel || ''
        setAiModel(model)
        setCustomModel(model)
      } catch {}
    }
  }, [])

  const handleProviderChange = (providerId: string) => {
    setApiProvider(providerId)
    setAvailableModels([])
    setAiModel('')
    setCustomModel('')
    setConnectionStatus('idle')
    const provider = AI_PROVIDERS.find(p => p.id === providerId)
    if (provider) {
      setApiBaseUrl(provider.baseUrl)
      if (provider.models.length > 0) {
        setAvailableModels(provider.models)
      }
    }
  }

  const testConnection = async (): Promise<boolean> => {
    if (!apiKey.trim() || !apiBaseUrl.trim()) {
      setConnectionStatus('error')
      setConnectionMessage('请先填写 API 地址和 Key')
      return false
    }

    setIsTestingConnection(true)
    setConnectionStatus('idle')
    setConnectionMessage('')

    try {
      const response = await fetch('/api/models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: apiKey.trim(),
          baseUrl: apiBaseUrl.trim(),
          provider: apiProvider,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '连接失败')
      }

      setConnectionStatus('success')
      setConnectionMessage('连接成功！')
      setAvailableModels(data.models || [])
      if (data.models && data.models.length > 0) {
        setAiModel(data.models[0])
        setCustomModel(data.models[0])
      }
      return true
    } catch (e: any) {
      setConnectionStatus('error')
      setConnectionMessage(e.message || '连接失败')
      return false
    } finally {
      setIsTestingConnection(false)
    }
  }

  const fetchModels = async () => {
    await testConnection()
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setMessage(null)

    const finalModel = apiProvider === 'custom' ? customModel : aiModel

    const settings: Settings = {
      apiProvider,
      apiBaseUrl: apiBaseUrl.trim(),
      apiKey: apiKey.trim(),
      aiModel: finalModel,
    }

    // Save to localStorage
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))

    // Test connection first
    const connected = await testConnection()

    // If connection successful, also try to save to Supabase (but don't block on it)
    if (connected) {
      try {
        const { createClient } = await import('@/lib/supabase/client')
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          await supabase.from('profiles').upsert({
            id: user.id,
            ai_provider: apiProvider,
            ai_base_url: apiBaseUrl.trim(),
            openai_api_key: apiKey.trim(),
            ai_model: finalModel,
          })
        }
      } catch {}
    }

    setIsSaving(false)

    if (connected) {
      setMessage({ type: 'success', text: '设置已保存，AI 连接测试成功！' })
    } else {
      setMessage({ type: 'error', text: '设置已保存，但 AI 连接测试失败：' + connectionMessage })
    }

    // Reset message after 5 seconds
    setTimeout(() => setMessage(null), 5000)
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
              <div className="space-y-3">
                <Label>AI 提供商</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
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
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="apiBaseUrl"
                    placeholder="https://api.openai.com/v1"
                    value={apiBaseUrl}
                    onChange={(e) => { setApiBaseUrl(e.target.value); setConnectionStatus('idle') }}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* API Key */}
              <div className="space-y-2">
                <Label htmlFor="apiKey">API Key</Label>
                <div className="relative">
                  <Input
                    id="apiKey"
                    type={showKey ? 'text' : 'password'}
                    placeholder={apiProvider === 'google' ? 'AIza...' : 'sk-...'}
                    value={apiKey}
                    onChange={(e) => { setApiKey(e.target.value); setConnectionStatus('idle') }}
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

              {/* Connection Test Result */}
              {connectionStatus !== 'idle' && (
                <div className={`p-3 rounded-lg flex items-center gap-2 ${
                  connectionStatus === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                }`}>
                  {connectionStatus === 'success' ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : (
                    <XCircle className="w-5 h-5" />
                  )}
                  <span className="text-sm">{connectionMessage}</span>
                </div>
              )}

              {/* Fetch Models Button */}
              <div className="space-y-2">
                <Label>AI 模型</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={fetchModels}
                    disabled={isFetchingModels || isTestingConnection || !apiKey.trim() || !apiBaseUrl.trim()}
                  >
                    {isTestingConnection ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4 mr-2" />
                    )}
                    拉取模型
                  </Button>
                </div>
              </div>

              {/* Model Selection */}
              <div className="space-y-3">
                {availableModels.length > 0 ? (
                  <>
                    <Label>可用模型（点击选择）</Label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                      {availableModels.map((model) => (
                        <button
                          key={model}
                          type="button"
                          onClick={() => { setAiModel(model); setCustomModel(model) }}
                          className={`p-2 rounded-lg border text-sm transition-colors truncate ${
                            aiModel === model
                              ? 'border-black bg-gray-50 font-medium'
                              : 'border-gray-200 hover:border-gray-400'
                          }`}
                          title={model}
                        >
                          {model}
                        </button>
                      ))}
                    </div>
                  </>
                ) : currentProvider && currentProvider.models.length > 0 ? (
                  <>
                    <Label>预设模型</Label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {currentProvider.models.map((model) => (
                        <button
                          key={model}
                          type="button"
                          onClick={() => { setAiModel(model); setCustomModel(model) }}
                          className={`p-2 rounded-lg border text-sm transition-colors ${
                            aiModel === model
                              ? 'border-black bg-gray-50 font-medium'
                              : 'border-gray-200 hover:border-gray-400'
                          }`}
                        >
                          {model}
                        </button>
                      ))}
                    </div>
                  </>
                ) : (
                  <>
                    <Label>手动输入模型名称</Label>
                    <Input
                      placeholder="例如：gpt-4o, gemini-1.5-flash"
                      value={customModel}
                      onChange={(e) => { setCustomModel(e.target.value); setAiModel(e.target.value) }}
                    />
                  </>
                )}
              </div>

              {/* Current Selection Display */}
              {(aiModel || customModel) && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-500">当前选择：</span>
                  <span className="text-sm font-medium ml-2">{aiModel || customModel}</span>
                </div>
              )}

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  {message && (
                    <p className={`text-sm ${message.type === 'success' ? 'text-green-600' : 'text-red-500'}`}>
                      {message.text}
                    </p>
                  )}
                  <p className="text-xs text-gray-400 mt-1">设置保存在浏览器本地，换设备需要重新填写</p>
                </div>
                <Button type="submit" disabled={isSaving} className="bg-black text-white hover:bg-gray-800">
                  <Save className="w-4 h-4 mr-2" />
                  {isSaving ? '保存并测试...' : '保存设置'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}