import { createSupabaseServer } from '@/lib/supabase-server'
import Link from 'next/link'
import { Mic, ChevronRight } from 'lucide-react'

async function getSessions() {
  const supabase = createSupabaseServer()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return []

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('auth_user_id', session.user.id)
    .single()

  if (!profile) return []

  const { data } = await supabase
    .from('sessions')
    .select('id, recorded_at, total_duration_sec, status')
    .eq('user_id', profile.id)
    .order('recorded_at', { ascending: false })

  return data ?? []
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric',
  })
}

function formatDuration(sec: number | null) {
  if (!sec) return '-'
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return m > 0 ? `${m}분 ${s}초` : `${s}초`
}

export default async function RecordsPage() {
  const sessions = await getSessions()

  return (
    <div className="px-4 pt-12 pb-4">
      <h1 className="text-2xl font-bold text-deep mb-6">내 기록</h1>

      {sessions.length === 0 ? (
        <div className="text-center py-20 space-y-4">
          <Mic size={48} className="mx-auto text-muted" />
          <p className="text-mid">아직 녹음 기록이 없습니다.</p>
          <Link
            href="/session"
            className="inline-block px-5 py-2.5 rounded-xl bg-amber text-white text-sm font-medium hover:bg-amber-dark transition-colors"
          >
            첫 녹음 시작하기
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map((s) => (
            <Link
              key={s.id}
              href={`/records/${s.id}`}
              className="flex items-center justify-between bg-warm-white border border-muted/20 rounded-2xl px-5 py-4 hover:bg-muted/10 transition-colors"
            >
              <div>
                <p className="font-medium text-deep">{formatDate(s.recorded_at)}</p>
                <p className="text-xs text-muted mt-1">
                  {s.status === 'completed' ? '완료' : '진행 중'} · {formatDuration(s.total_duration_sec)}
                </p>
              </div>
              <ChevronRight size={18} className="text-muted" />
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
