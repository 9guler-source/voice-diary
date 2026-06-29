import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '기억을 꼭 붙잡아!! 🤬💢 — 찬란했던 나의 이야기',
  description: '기억이 흐려지기 전에, 지금 목소리로 남겨두세요.',
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
