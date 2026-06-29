import { redirect } from 'next/navigation'
import { createSupabaseServer } from '@/lib/supabase-server'
import Link from 'next/link'
import { Mic, BookOpen } from 'lucide-react'

async function getData() {
  const supabase = await createSupabaseServer()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, name')
    .eq('auth_user_id', session.user.id)
    .single()

  if (!profile) return null

  const { count: sessionCount } = await supabase
    .from('sessions')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', profile.id)
    .eq('status', 'completed')

  return { profile, sessionCount: sessionCount ?? 0 }
}

export default async function HomePage() {
  const data = await getData()
  if (!data) redirect('/login')

  return (
    <div className="px-4 pt-12 pb-4 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-deep">
          {data.profile.name ? `${data.profile.name}님, 안녕하세요` : '안녕하세요'}
        </h1>
        <p className="text-muted text-sm mt-1">오늘도 소중한 이야기를 남겨보세요</p>
      </div>

      <div className="bg-amber/10 border border-amber/30 rounded-2xl p-5">
        <p className="text-amber-dark text-sm font-medium mb-1">녹음 현황</p>
        <p className="text-3xl font-bold text-deep">{data.sessionCount}회</p>
        <p className="text-muted text-xs mt-1">완료된 녹음 세션</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Link
          href="/select-questions?mode=session"
          className="bg-amber text-white rounded-2xl p-5 flex flex-col gap-3 hover:bg-amber-dark transition-colors"
        >
          <Mic size={28} />
          <div>
            <p className="font-semibold">녹음 시작</p>
            <p className="text-xs opacity-80 mt-0.5">문항 선택 후 녹음</p>
          </div>
        </Link>
        <Link
          href="/records"
          className="bg-warm-white border border-muted/20 text-deep rounded-2xl p-5 flex flex-col gap-3 hover:bg-muted/10 transition-colors"
        >
          <BookOpen size={28} className="text-sage" />
          <div>
            <p className="font-semibold">내 기록</p>
            <p className="text-xs text-muted mt-0.5">지난 녹음 듣기</p>
          </div>
        </Link>
      </div>

      <div className="bg-warm-white border border-muted/20 rounded-2xl p-5">
        <p className="text-sm font-medium text-deep mb-3">이런 이야기를 해보세요</p>
        <ul className="space-y-2 text-sm text-mid">
          <li>• 태어난 곳과 어린 시절 동네 이야기</li>
          <li>• 학창시절 친구와의 추억</li>
          <li>• 가족과의 소중한 기억</li>
          <li>• 살면서 가장 행복했던 순간</li>
        </ul>
      </div>
    </div>
  )
}
