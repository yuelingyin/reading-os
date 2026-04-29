'use client'

import Link from 'next/link'
import { Key, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

const SETTINGS_KEY = 'reading-os-settings'

export function APIConfigPrompt() {
  // Check if API is configured in localStorage
  const checkAPI = () => {
    if (typeof window === 'undefined') return false
    const stored = localStorage.getItem(SETTINGS_KEY)
    if (!stored) return false
    try {
      const settings = JSON.parse(stored)
      return settings.apiKey && settings.apiBaseUrl
    } catch {
      return false
    }
  }

  if (checkAPI()) return null

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
      <div className="flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm font-medium text-yellow-800">
            AI 功能需要配置 API
          </p>
          <p className="text-xs text-yellow-600 mt-1">
            请先配置 AI API Key 才能使用 AI 预读、守门员等功能
          </p>
          <Link href="/settings" className="inline-block mt-3">
            <Button size="sm" className="bg-yellow-600 hover:bg-yellow-700 text-white">
              <Key className="w-4 h-4 mr-1" />
              去设置
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}