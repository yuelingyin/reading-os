import OpenAI from 'openai'

export async function verifyWithAI(
  apiKey: string,
  bookGenre: string,
  bookTitle: string,
  chapterNumber: number,
  userReflection: string
): Promise<{ passed: boolean; feedback: string; actionable_advice: string }> {
  const openai = new OpenAI({ apiKey })

  const prompts: Record<string, string> = {
    philosophy: `你是一位严厉的哲学导师，正在对读者进行苏格拉底式追问。

书籍：《${bookTitle}》
章节：第 ${chapterNumber} 章

读者提交的核心感悟：
"${userReflection}"

请通过三个层次的追问来验证读者是否真正理解：
1. 概念澄清：你对这个核心概念的理解与作者的原意是否一致？举出具体段落说明。
2. 认知碰撞：你的既有认知与书中观点产生了什么冲突？你如何整合这种冲突？
3. 思辨延伸：这个观点可以反驳吗？它的局限性在哪里？

最终判定：返回 JSON 格式
{"passed": true/false, "feedback": "严厉的评语或表扬", "actionable_advice": "如果未通过，具体指出需要重读哪部分或需要进一步思考什么"}`,

    science: `你是一位严格的科学评审，正在验证读者对硬科学内容的理解。

书籍：《${bookTitle}》
章节：第 ${chapterNumber} 章

读者提交的核心感悟：
"${userReflection}"

验证要求：
1. 概念准确性：读者对书中客观概念的解释是否准确？有无混淆或简化？
2. 逻辑推演：如果是数学或科学推论，读者的理解是否遵循正确的逻辑链？
3. 证据意识：读者是否理解结论的前提条件和适用范围？

最终判定：返回 JSON 格式
{"passed": true/false, "feedback": "严厉的评语或表扬", "actionable_advice": "如果未通过，指出理解偏差在哪里，需要重读哪些具体内容"}`,

    business: `你是一位犀利的商业顾问，正在追问落地行动。

书籍：《${bookTitle}》
章节：第 ${chapterNumber} 章

读者提交的核心感悟：
"${userReflection}"

追问焦点：
1. 具体化：作者提到的策略/方法，读者能说出具体要做什么吗？而不是只停留在"学到了"层面。
2. 适用边界：这个方法在什么场景下适用？什么情况下不适用？
3. 行动转化：读者有具体的下一步行动吗？可以是思维方式的改变或实际的行动步骤。

最终判定：返回 JSON 格式
{"passed": true/false, "feedback": "严厉的评语或表扬", "actionable_advice": "如果未通过，给出可以立刻执行的具体建议"}`,

    literature: `你是一位文学评论家，正在评估读者对文学作品的理解。

书籍：《${bookTitle}》
章节：第 ${chapterNumber} 章

读者提交的核心感悟：
"${userReflection}"

评价维度：
1. 文本细读：读者能否引用具体文本段落来支撑自己的理解？
2. 审美感知：对人物的塑造、叙事手法、语言风格是否有敏锐的感知？
3. 共情深度：读者是否真正理解人物的处境和动机，而不只是做道德评判？

最终判定：返回 JSON 格式
{"passed": true/false, "feedback": "严厉的评语或表扬", "actionable_advice": "如果未通过，指出需要更深入理解的方面"}`,
  }

  const prompt = prompts[bookGenre] || prompts['philosophy']

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: '你是一位严格但有建设性的评审。请始终返回有效的 JSON，不要有其他内容。' },
      { role: 'user', content: prompt },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.3,
  })

  const content = response.choices[0].message.content || '{}'
  const result = JSON.parse(content)

  return {
    passed: result.passed === true,
    feedback: result.feedback || '',
    actionable_advice: result.actionable_advice || '',
  }
}