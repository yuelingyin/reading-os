import OpenAI from 'openai'
import { createClient, getUser } from '@/lib/supabase/server'
import type { AIRecommendation, BookGenre } from '@/types'

export async function getAIRecommendation(
  bookTitle: string,
  author?: string,
  userGoal?: string
): Promise<{ success: boolean; recommendation?: AIRecommendation; error?: string }> {
  const user = await getUser()
  if (!user) return { success: false, error: 'Unauthorized' }

  const supabase = await createClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('openai_api_key')
    .eq('id', user.id)
    .single()

  if (!profile?.openai_api_key) {
    return { success: false, error: '请先在设置中配置 OpenAI API Key' }
  }

  try {
    const openai = new OpenAI({ apiKey: profile.openai_api_key })

    const prompt = userGoal
      ? `用户的目标/困惑是："${userGoal}"

请分析书籍《${bookTitle}》${author ? `（作者：${author}）` : ''}，判断它是否能帮助用户达成目标。

返回 JSON 格式：
{
  "core_questions": ["针对用户目标的1-3个核心问题"],
  "suggested_genre": "self-improvement|investment|tech|humanities|literature|tools",
  "reading_suggestion": "简短的建议，说明这本书适合什么样的读者",
  "target_audience": "这本书的目标读者是谁"
}`
      : `请分析书籍《${bookTitle}》${author ? `（作者：${author}）` : ''}

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

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: '你是一位资深阅读顾问，擅长帮助用户找到适合自己的书籍并制定阅读目标。始终返回有效的 JSON。',
        },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
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