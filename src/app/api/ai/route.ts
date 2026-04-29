import { NextRequest, NextResponse } from 'next/server'

const SETTINGS_KEY = 'reading-os-settings'

function getAIConfigFromRequest(request: NextRequest) {
  // Try to get from Supabase via auth cookie
  // Or accept settings passed from client
  // For now, client will pass settings in body

  const apiKey = request.headers.get('x-ai-api-key')
  const baseUrl = request.headers.get('x-ai-base-url')
  const model = request.headers.get('x-ai-model')

  if (apiKey && baseUrl) {
    return { apiKey, baseUrl, model: model || 'gpt-4o' }
  }

  return null
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { title, author, mode } = body

    // Try to get config from request headers (passed from client)
    let config = getAIConfigFromRequest(request)

    // If no config in headers, check if user is authenticated and has Supabase config
    if (!config) {
      // Get user from cookie
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

      if (supabaseUrl && supabaseAnonKey) {
        // We'll need to check auth cookie and then profiles table
        // For now, return error asking for config
        return NextResponse.json({
          success: false,
          error: '请先在设置中配置 AI API'
        })
      }
    }

    if (!config) {
      return NextResponse.json({
        success: false,
        error: '请先在设置中配置 AI API'
      })
    }

    // Import OpenAI dynamically
    const OpenAI = (await import('openai')).default
    const openai = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseUrl,
    })

    let prompt: string

    if (mode === 'FIND_BOOK_OPTIONS') {
      prompt = `用户输入了书名："${title}"

请根据这个书名，返回最匹配的书籍信息。如果有多个相似的书，都列出来。

返回严格的JSON格式示例：
{
  "options": [
    {"title": "书名A", "author": "作者A", "year": "2020"},
    {"title": "书名B", "author": "作者B", "year": "2019"}
  ],
  "reading_suggestion": "找到X本书",
  "target_audience": ""
}

注意：
- 返回多个选项用 options 数组
- 如果只有一本书，只返回一个
- 如果不确定作者，写"作者未知"
- year 是出版年份（如果知道的话）
- 不要在JSON前后添加任何内容`
    } else if (mode === 'goal' && body.userGoal) {
      prompt = `用户的目标/困惑是："${body.userGoal}"

请分析书籍《${title}》${author ? `（作者：${author}）` : ''}，判断它是否能帮助用户达成目标。

返回 JSON 格式：
{
  "core_questions": ["针对用户目标的1-3个核心问题"],
  "suggested_genre": "self-improvement|investment|tech|humanities|literature|tools",
  "reading_suggestion": "简短的建议，说明这本书适合什么样的读者",
  "target_audience": "这本书的目标读者是谁"
}`
    } else {
      prompt = `请分析书籍《${title}》${author ? `（作者：${author}）` : ''}

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

    // Use gpt-4o-mini for speed - it's much faster and cheaper
    const model = config.model?.includes('mini') ? config.model : 'gpt-4o-mini'

    const response = await openai.chat.completions.create({
      model: model,
      messages: [
        { role: 'system', content: '你是阅读顾问，返回JSON格式数据，不要思考标签，不要markdown。格式：{"options":[],"reading_suggestion":"","target_audience":""}' },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 500,
    })

    let content = response.choices[0].message.content || '{}'

    // Remove any thinking tags or markdown that AI might have added
    content = content.replace(/<think>[\s\S]*?<\/think>/gi, '')
    content = content.replace(/```json\s*/gi, '')
    content = content.replace(/```\s*/gi, '')
    content = content.trim()

    // Make sure content is valid JSON
    try {
      JSON.parse(content) // Just to verify
    } catch {
      // If not valid JSON, try to extract JSON from the content
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        content = jsonMatch[0]
      } else {
        throw new Error('AI 返回的不是有效的 JSON')
      }
    }

    const result = JSON.parse(content)

    return NextResponse.json({
      success: true,
      recommendation: {
        core_questions: result.core_questions || [],
        suggested_genre: result.suggested_genre || 'self-improvement',
        reading_suggestion: result.reading_suggestion || result.options?.[0]?.title || '',
        target_audience: result.options?.map((o: any) => o.author || '作者未知').join('、') || result.target_audience || '',
        options: result.options || [],
      },
    })
  } catch (e: any) {
    return NextResponse.json({
      success: false,
      error: e.message || 'AI 调用失败'
    })
  }
}