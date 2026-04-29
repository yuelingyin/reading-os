'use client'

import { useState } from 'react'
import { X, ShieldAlert, CheckCircle, Loader2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'

interface GatekeeperModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (reflection: string) => Promise<{ passed: boolean; feedback: string; actionable_advice: string }>
  bookGenre: string
  chapterNumber: number
}

export function GatekeeperModal({ isOpen, onClose, onSubmit, bookGenre, chapterNumber }: GatekeeperModalProps) {
  const [reflection, setReflection] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<{ passed: boolean; feedback: string; actionable_advice: string } | null>(null)

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!reflection.trim()) return
    setIsLoading(true)
    const res = await onSubmit(reflection)
    setIsLoading(false)
    setResult(res)
  }

  const handleClose = () => {
    setResult(null)
    setReflection('')
    onClose()
  }

  const genreLabels: Record<string, string> = {
    philosophy: '哲学/社科',
    science: '硬科学/数学',
    business: '商业/工具',
    literature: '文学/小说',
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-orange-500" />
            <h2 className="font-bold">AI 守门员验证</h2>
          </div>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {!result ? (
          <form onSubmit={handleSubmit} className="p-4 space-y-4">
            <div className="p-3 bg-orange-50 rounded-lg">
              <p className="text-sm text-orange-800">
                <strong>书籍类型：</strong>{genreLabels[bookGenre] || bookGenre}
              </p>
              <p className="text-sm text-orange-800 mt-1">
                <strong>验证章节：</strong>第 {chapterNumber} 章
              </p>
            </div>

            <div className="p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-700">
                请输入你对本章的核心感悟。AI 守门员将根据书籍类型进行严格评估。
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reflection">核心感悟</Label>
              <Textarea
                id="reflection"
                placeholder="请描述你从本章学到的主要内容、产生的思考、以及与你既有认知的碰撞..."
                value={reflection}
                onChange={(e) => setReflection(e.target.value)}
                rows={6}
                required
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={handleClose}>取消</Button>
              <Button type="submit" disabled={isLoading || !reflection.trim()} className="bg-orange-500 hover:bg-orange-600 text-white">
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    AI 审核中...
                  </>
                ) : (
                  '提交审核'
                )}
              </Button>
            </div>
          </form>
        ) : (
          <div className="p-4 space-y-4">
            {result.passed ? (
              <div className="text-center py-6">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-green-600 mb-2">验证通过！</h3>
                <p className="text-gray-600 mb-4">{result.feedback}</p>
                {result.actionable_advice && (
                  <p className="text-sm text-gray-500 bg-gray-50 p-3 rounded">{result.actionable_advice}</p>
                )}
              </div>
            ) : (
              <div className="text-center py-6">
                <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-red-600 mb-2">验证未通过</h3>
                <p className="text-gray-700 mb-3">{result.feedback}</p>
                {result.actionable_advice && (
                  <div className="text-left bg-red-50 p-3 rounded-lg mb-4">
                    <p className="text-sm font-medium text-red-800">改进建议：</p>
                    <p className="text-sm text-red-700 mt-1">{result.actionable_advice}</p>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-center">
              <Button onClick={handleClose} className={result.passed ? 'bg-green-500 hover:bg-green-600 text-white' : ''}>
                {result.passed ? '继续阅读' : '重新思考'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}