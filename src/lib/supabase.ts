import { createBrowserClient } from '@supabase/ssr'
import type { Database } from './database.types'

// createBrowserClient: 세션을 localStorage가 아닌 쿠키에 저장
// → 서버 컴포넌트/미들웨어의 createServerClient가 같은 쿠키를 읽을 수 있음
export const supabase = createBrowserClient<Database, 'voice_diary'>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { db: { schema: 'voice_diary' } }
)
