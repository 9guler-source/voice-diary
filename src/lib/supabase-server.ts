import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from './database.types'

export function createSupabaseServer() {
  const cookieStore = cookies()
  return createServerClient<Database, 'voice_diary'>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      db: { schema: 'voice_diary' },
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        // 서버 컴포넌트는 쿠키 쓰기 불가 — 미들웨어에서 갱신
        setAll() {},
      },
    }
  )
}
