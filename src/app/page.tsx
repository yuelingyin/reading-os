import Link from 'next/link'
import { BookOpen, Target, Lightbulb, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white text-black">
      <section className="px-6 pt-32 pb-20 max-w-3xl mx-auto text-center">
        <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-6 leading-tight">
          Reading OS<br />
          <span className="text-gray-400">重新定义你的阅读投资回报率</span>
        </h1>
        <p className="text-xl text-gray-500 mb-10 max-w-xl mx-auto leading-relaxed">
          告别读完就忘，把每一本书转化为真实的行动与认知资产。
        </p>
        <Link href="/login">
          <Button size="lg" className="bg-black text-white hover:bg-gray-800 text-lg px-8">
            免费开始使用 <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </Link>
      </section>
      <Separator />
      <section className="px-6 py-20 max-w-4xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card><CardHeader><CardTitle className="text-base">读前 ROI 评估</CardTitle></CardHeader><CardContent><p className="text-sm text-gray-500">记录读书动机与核心诉求，评估是否值得读</p></CardContent></Card>
          <Card><CardHeader><CardTitle className="text-base">章节微打卡复盘</CardTitle></CardHeader><CardContent><p className="text-sm text-gray-500">每章记录核心知识点，验证是否解答了问题</p></CardContent></Card>
          <Card><CardHeader><CardTitle className="text-base">读后行动转化</CardTitle></CardHeader><CardContent><p className="text-sm text-gray-500">生成 Action Items，把知识落地为行动</p></CardContent></Card>
        </div>
      </section>
      <Separator />
      <footer className="px-6 py-8 border-t text-center text-sm text-gray-400">
        Reading OS · Built with Next.js + Supabase
      </footer>
    </div>
  )
}