import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

type Props = { params: { id: string } }

async function getSession(id: string) {
  const supabase = createClient<Database, 'voice_diary'>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { db: { schema: 'voice_diary' } }
  )
  const { data: session } = await supabase
    .from('sessions')
    .select('id, recorded_at, status')
    .eq('id', id)
    .single()

  if (!session) return null

  const { data: recordings } = await supabase
    .from('recordings')
    .select('id, question_id, question_order, audio_url, duration_sec, stt_text, is_free_talk')
    .eq('session_id', id)
    .order('question_order')

  const questionIds = (recordings ?? []).map((r) => r.question_id)
  const { data: questions } = await supabase
    .from('questions')
    .select('id, category, content')
    .in('id', questionIds)

  const qMap = new Map((questions ?? []).map((q) => [q.id, q]))

  return {
    session,
    recordings: (recordings ?? []).map((r) => ({
      ...r,
      question: qMap.get(r.question_id),
    })),
  }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

export default async function SessionDetailPage({ params }: Props) {
  const data = await getSession(params.id)

  if (!data) {
    return (
      <div className="px-4 pt-12">
        <p className="text-muted">기록을 찾을 수 없습니다.</p>
        <Link href="/records" className="text-amber-dark text-sm">목록으로</Link>
      </div>
    )
  }

  return (
    <div className="px-4 pt-10 pb-4">
      <Link href="/records" className="flex items-center gap-1 text-mid text-sm mb-6 hover:text-deep">
        <ChevronLeft size={16} /> 목록으로
      </Link>
      <h1 className="text-xl font-bold text-deep mb-1">녹음 세션</h1>
      <p className="text-xs text-muted mb-6">{formatDate(data.session.recorded_at)}</p>

      <div className="space-y-4">
        {data.recordings.map((r) => (
          <div key={r.id} className={`bg-warm-white border border-muted/20 rounded-2xl p-4 ${r.is_free_talk ? 'border-amber/30' : ''}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted">{r.question_order}번</span>
              {r.is_free_talk && (
                <span className="text-xs bg-amber text-white px-2 py-0.5 rounded-full">자유 이야기</span>
              )}
            </div>
            {r.question && (
              <p className="text-sm font-medium text-deep mb-3">{r.question.content}</p>
            )}
            {r.audio_url && (
              <audio
                controls
                src={r.audio_url}
                className="w-full h-10 rounded-lg"
              />
            )}
            {r.stt_text && (
              <p className="mt-3 text-xs text-mid bg-cream rounded-lg p-3 leading-relaxed">
                {r.stt_text}
              </p>
            )}
            {!r.audio_url && (
              <p className="text-xs text-muted italic">녹음 파일 없음 (건너뜀)</p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
