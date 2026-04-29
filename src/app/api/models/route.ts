import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { apiKey, baseUrl, provider } = await request.json()

    if (!apiKey || !baseUrl) {
      return NextResponse.json({ error: 'API Key 和地址不能为空' }, { status: 400 })
    }

    // For Google Gemini, use a different endpoint
    if (provider === 'google') {
      try {
        const response = await fetch(
          `${baseUrl}/models?key=${apiKey}`,
          { headers: { 'Content-Type': 'application/json' } }
        )

        if (!response.ok) {
          throw new Error('Failed to fetch Google models')
        }

        const data = await response.json()
        const models = data.models?.map((m: any) => m.name.replace('models/', '')) || []

        return NextResponse.json({ models })
      } catch (e: any) {
        return NextResponse.json({ error: e.message || '获取模型失败' }, { status: 500 })
      }
    }

    // For OpenAI-compatible APIs
    try {
      const response = await fetch(`${baseUrl}/models`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error('Failed to fetch models')
      }

      const data = await response.json()
      const models = data.data?.map((m: any) => m.id).filter((id: string) => {
        // Filter out some common non-model entries
        if (id.includes('batch')) return false
        if (id.includes('assistant')) return false
        return true
      }) || []

      return NextResponse.json({ models })
    } catch (e: any) {
      return NextResponse.json({ error: e.message || '获取模型失败' }, { status: 500 })
    }
  } catch (e: any) {
    return NextResponse.json({ error: e.message || '服务器错误' }, { status: 500 })
  }
}
