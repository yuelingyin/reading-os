import type { Metadata } from 'next'
import './globals.css'
import { MainNav } from '@/components/main-nav'

export const metadata: Metadata = {
  title: 'Reading OS',
  description: '阅读决策与代谢系统',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN">
      <body>
        <MainNav />
        <div className="pt-14">
          {children}
        </div>
      </body>
    </html>
  )
}