import OpenAI from 'openai'
import { getUser } from '@/lib/supabase/server'
import type { AIRecommendation, BookGenre } from '@/types'

// Get AI config from Supabase or localStorage fallback
async function getAIConfig() {
  const user = await getUser()
  if (!user) return null

  // Try Supabase first
  try {
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()
    const { data: profile } = await supabase
      .from('profiles')
      .select('ai_provider, ai_base_url, openai_api_key, ai_model')
      .eq('id', user.id)
      .single()

    if (profile?.openai_api_key && profile?.ai_base_url) {
      return {
        apiKey: profile.openai_api_key,
        baseUrl: profile.ai_base_url,
        model: profile.ai_model || 'gpt-4o',
        provider: profile.ai_provider || 'openai',
      }
    }
  } catch {}

  // Fallback to localStorage
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('reading-os-settings')
    if (stored) {
      try {
        const settings = JSON.parse(stored)
        if (settings.apiKey && settings.apiBaseUrl) {
          return {
            apiKey: settings.apiKey,
            baseUrl: settings.apiBaseUrl,
            model: settings.aiModel || 'gpt-4o',
            provider: settings.apiProvider || 'openai',
          }
        }
      } catch {}
    }
  }

  return null
}

export async function getAIRecommendation(
  bookTitle: string,
  author?: string,
  userGoal?: string
): Promise<{ success: boolean; recommendation?: AIRecommendation; error?: string }> {
  const config = await getAIConfig()

  if (!config) {
    return { success: false, error: '请先在设置中配置 AI API' }
  }

  try {
    const openai = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseUrl,
    })

    let prompt: string
    let responseFormat: { type: 'json_object' } | undefined = { type: 'json_object' }

    // Special mode: FIND_BOOK_OPTIONS
    if (userGoal === 'FIND_BOOK_OPTIONS') {
      prompt = `用户输入了书名："${bookTitle}"

请根据这个书名，返回最匹配的书籍信息。可能是：
1. 完全匹配的书
2. 类似书名的其他书籍
3. 如果书名不完整，补充完整

返回 JSON 格式：
{
  "core_questions": [],
  "suggested_genre": "self-improvement",
  "reading_suggestion": "根据书名推测的书籍信息，例如：《书名》- 作者名",
  "target_audience": "可能的作者列表，用顿号分隔，例如：张三名、李四名"
}`
    } else if (userGoal) {
      // Goal-based analysis
      prompt = `用户的目标/困惑是："${userGoal}"

请分析书籍《${bookTitle}》${author ? `（作者：${author}）` : ''}，判断它是否能帮助用户达成目标。

返回 JSON 格式：
{
  "core_questions": ["针对用户目标的1-3个核心问题"],
  "suggested_genre": "self-improvement|investment|tech|humanities|literature|tools",
  "reading_suggestion": "简短的建议，说明这本书适合什么样的读者",
  "target_audience": "这本书的目标读者是谁"
}`
    } else {
      // Direct analysis
      prompt = `请分析书籍《${bookTitle}》${author ? `（作者：${author}）` : ''}

返回一个全面的阅读推荐分析，包括：
1. 这本书最值得探索的1-3个核心问题
2. 最适合的分类
3. 阅读建议

返回 JSON 格式：
{
  "core_questions": ["核心问题1", "核心问题2", "核心问题3"],
  "suggested_genre": "self-improvement|investment|tech|humanities|literature|tools",
  "reading_suggestion": "一句话说明这本书的价值和适合人群",
  "target_audience": "谁最应该读这本书"
}`
    }

    const response = await openai.chat.completions.create({
      model: config.model,
      messages: [
        {
          role: 'system',
          content: '你是一位资深阅读顾问，擅长帮助用户找到适合自己的书籍。始终返回有效的 JSON。',
        },
        { role: 'user', content: prompt },
      ],
      response_format: responseFormat,
      temperature: 0.7,
    })

    const content = response.choices[0].message.content || '{}'
    const result = JSON.parse(content)

    return {
      success: true,
      recommendation: {
        core_questions: result.core_questions || [],
        suggested_genre: result.suggested_genre as BookGenre || 'self-improvement',
        reading_suggestion: result.reading_suggestion || '',
        target_audience: result.target_audience || '',
      },
    }
  } catch (e: any) {
    return { success: false, error: e.message || 'AI 分析失败' }
  }
}
