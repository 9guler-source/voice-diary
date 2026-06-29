import { createSupabaseServer } from '@/lib/supabase-server'
import Link from 'next/link'
import { Mic, ChevronRight } from 'lucide-react'
import FreeTalkPanel from './FreeTalkPanel'
import type { FreeTalkItem } from './FreeTalkPanel'

async function getProfileId(supabase: Awaited<ReturnType<typeof createSupabaseServer>>) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return null
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('auth_user_id', session.user.id)
    .single()
  return profile?.id ?? null
}

async function getSessions() {
  const supabase = await createSupabaseServer()
  const profileId = await getProfileId(supabase)
  if (!profileId) return []

  const { data } = await supabase
    .from('sessions')
    .select('id, recorded_at, total_duration_sec, status')
    .eq('user_id', profileId)
    .order('recorded_at', { ascending: false })

  return data ?? []
}

async function getFreeTalks(): Promise<FreeTalkItem[]> {
  const supabase = await createSupabaseServer()
  const profileId = await getProfileId(supabase)
  if (!profileId) return []

  // 이 유저의 세션 목록 (날짜 포함)
  const { data: userSessions } = await supabase
    .from('sessions')
    .select('id, recorded_at')
    .eq('user_id', profileId)
    .order('recorded_at', { ascending: false })

  if (!userSessions?.length) return []

  const sessionIds = userSessions.map((s) => s.id)
  const sessionDateMap = new Map(userSessions.map((s) => [s.id, s.recorded_at]))

  // 해당 세션들의 자유 이야기 녹음 (audio_url 있는 것만)
  const { data: recs } = await supabase
    .from('recordings')
    .select('id, audio_url, stt_text, session_id')
    .eq('is_free_talk', true)
    .not('audio_url', 'is', null)
    .in('session_id', sessionIds)

  if (!recs) return []

  return recs
    .filter((r) => r.audio_url)
    .map((r) => ({
      id: r.id,
      session_id: r.session_id,
      audio_url: r.audio_url as string,
      stt_text: r.stt_text,
      recorded_at: sessionDateMap.get(r.session_id) ?? '',
    }))
    .sort((a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime())
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
  const [sessions, freeTalks] = await Promise.all([getSessions(), getFreeTalks()])

  return (
    <div className="px-4 pt-12 pb-4">
      <h1 className="text-2xl font-bold text-deep mb-6">내 기록</h1>

      {/* ── 자유 이야기 모아듣기 ── */}
      <FreeTalkPanel items={freeTalks} />

      {/* ── 세션 목록 ── */}
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
        <>
          <h2 className="text-sm font-semibold text-mid mb-3">전체 세션</h2>
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
        </>
      )}
    </div>
  )
}
