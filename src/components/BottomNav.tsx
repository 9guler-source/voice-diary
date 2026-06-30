"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/home", label: "홈", icon: "🏠" },
  { href: "/records", label: "내 기록", icon: "📼" },
  { href: "/settings", label: "설정", icon: "⚙️" },
];

export default function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      className="sticky bottom-0 bg-white border-t border-stone-200 flex"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {TABS.map((tab) => {
        const active = pathname?.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 text-xs ${
              active ? "text-brand-600 font-semibold" : "text-stone-400"
            }`}
          >
            <span className="text-lg">{tab.icon}</span>
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
