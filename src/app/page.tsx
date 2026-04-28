import Link from 'next/link'
import { BookOpen, Target, Lightbulb, ArrowRight, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white text-black">
      {/* Hero Section */}
      <section className="px-6 pt-32 pb-20 max-w-3xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gray-100 text-sm text-gray-600 mb-6">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          阅读ROI管理系统
        </div>

        <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-6 leading-tight">
          Reading OS
          <br />
          <span className="text-gray-400">重新定义你的阅读投资回报率</span>
        </h1>

        <p className="text-xl text-gray-500 mb-10 max-w-xl mx-auto leading-relaxed">
          告别读完就忘，把每一本书转化为真实的行动与认知资产。
          从立项到复盘，系统化提升你的阅读质量。
        </p>

        <Link href="/login">
          <Button size="lg" className="bg-black text-white hover:bg-gray-800 text-lg px-8">
            免费开始使用
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </Link>
      </section>

      <Separator />

      {/* Features Section */}
      <section className="px-6 py-20 max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-2xl font-bold mb-3">核心功能</h2>
          <p className="text-gray-500">覆盖阅读全周期的决策与转化系统</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-gray-200">
            <CardHeader>
              <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center mb-3">
                <Target className="w-5 h-5 text-gray-700" />
              </div>
              <CardTitle className="text-base">读前 ROI 评估</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500 leading-relaxed">
                记录读书动机与核心诉求，评估这本书是否真的值得投入时间。
                用问题引导阅读，让每一本书都有明确的阅读目标。
              </p>
            </CardContent>
          </Card>

          <Card className="border-gray-200">
            <CardHeader>
              <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center mb-3">
                <BookOpen className="w-5 h-5 text-gray-700" />
              </div>
              <CardTitle className="text-base">章节微打卡复盘</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500 leading-relaxed">
                每读完一章，立即记录核心知识点与读后感想。
                用"灵魂拷问"验证这一章是否解答了你的立项初心。
              </p>
            </CardContent>
          </Card>

          <Card className="border-gray-200">
            <CardHeader>
              <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center mb-3">
                <Lightbulb className="w-5 h-5 text-gray-700" />
              </div>
              <CardTitle className="text-base">读后行动转化</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500 leading-relaxed">
                全书读完后，生成具体的下一步行动清单。
                把书中的知识真正落地为生活中的改变，拒绝"读完了然并卵"。
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      <Separator />

      {/* How it works Section */}
      <section className="px-6 py-20 max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-2xl font-bold mb-3">四阶段阅读法</h2>
        </div>

        <div className="space-y-4">
          {[
            { step: '01', title: '读前决策', desc: '记录动机与核心诉求，评估是否值得读' },
            { step: '02', title: '读中复盘', desc: '章节微打卡，验证是否解答了你的问题' },
            { step: '03', title: '读后转化', desc: '生成 Action Items，知识落地到行动' },
            { step: '04', title: '知识延伸', desc: '记录关键词，推荐下一本该读的书' },
          ].map((item) => (
            <div key={item.step} className="flex items-start gap-4 p-4 rounded-lg hover:bg-gray-50 transition-colors">
              <span className="text-4xl font-bold text-gray-200 leading-none">{item.step}</span>
              <div>
                <h3 className="font-semibold text-lg">{item.title}</h3>
                <p className="text-gray-500 text-sm">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <Separator />

      {/* CTA Section */}
      <section className="px-6 py-24 text-center">
        <div className="max-w-xl mx-auto">
          <h2 className="text-2xl font-bold mb-4">开始你的阅读系统化之旅</h2>
          <p className="text-gray-500 mb-8">
            免费的 SaaS 工具，5 分钟上手，让你的阅读投资真正产生回报。
          </p>
          <Link href="/login">
            <Button size="lg" className="bg-black text-white hover:bg-gray-800 text-lg px-8">
              免费开始使用
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-8 border-t border-gray-100">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 text-gray-400 text-sm">
            <BookOpen className="w-4 h-4" />
            <span>Reading OS</span>
          </div>
          <p className="text-xs text-gray-300">Built with Next.js + Supabase</p>
        </div>
      </footer>
    </div>
  )
}