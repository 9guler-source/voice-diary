'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Mic, BookOpen, Settings } from 'lucide-react'

const tabs = [
  { href: '/home', icon: Home, label: '홈' },
  { href: '/session', icon: Mic, label: '녹음' },
  { href: '/records', icon: BookOpen, label: '기록' },
  { href: '/settings', icon: Settings, label: '설정' },
]

export default function TabBar() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-warm-white border-t border-muted/20 flex">
      {tabs.map(({ href, icon: Icon, label }) => {
        const active = pathname.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            className={`flex-1 flex flex-col items-center py-3 gap-1 text-xs transition-colors ${
              active ? 'text-amber' : 'text-muted hover:text-mid'
            }`}
          >
            <Icon size={22} strokeWidth={active ? 2.5 : 1.8} />
            <span className="font-medium">{label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
