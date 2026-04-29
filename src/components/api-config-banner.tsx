'use client'

import Link from 'next/link'
import { Key, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useState, useEffect } from 'react'

const SETTINGS_KEY = 'reading-os-settings'

export function APIConfigBanner() {
  const [isConfigured, setIsConfigured] = useState<boolean | null>(null)

  useEffect(() => {
    // Check localStorage for API config
    const stored = localStorage.getItem(SETTINGS_KEY)
    if (stored) {
      try {
        const settings = JSON.parse(stored)
        setIsConfigured(!!(settings.apiKey && settings.apiBaseUrl))
      } catch {
        setIsConfigured(false)
      }
    } else {
      setIsConfigured(false)
    }
  }, [])

  // Don't show anything while checking, or if configured
  if (isConfigured === null || isConfigured) {
    return null
  }

  return (
    <Card className="mb-6 border-yellow-300 bg-yellow-50">
      <CardContent className="pt-4 pb-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600" />
            <div>
              <p className="text-sm font-medium text-yellow-800">
                AI 功能需要配置 API Key
              </p>
              <p className="text-xs text-yellow-600">
                配置后才能使用 AI 预读、守门员等功能
              </p>
            </div>
          </div>
          <Link href="/settings">
            <Button size="sm" className="bg-yellow-600 hover:bg-yellow-700 text-white">
              <Key className="w-4 h-4 mr-1" />
              去设置
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}