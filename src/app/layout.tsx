import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '내 목소리 일기',
  description: '소중한 목소리와 추억을 기록하세요',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body className="antialiased">{children}</body>
    </html>
  )
}
