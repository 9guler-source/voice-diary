import { createSupabaseServer } from '@/lib/supabase-server'
import { QUESTIONS, FINAL_QUESTION } from '@/lib/questions'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

type Props = { params: { id: string } }

// 모든 문항을 로컬에서 조회 (DB 의존 없음)
const ALL_QUESTIONS = new Map([...QUESTIONS, FINAL_QUESTION].map((q) => [q.id, q]))

async function getSessionData(id: string) {
  const supabase = await createSupabaseServer()

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

  return { session, recordings: recordings ?? [] }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

export default async function SessionDetailPage({ params }: Props) {
  const data = await getSessionData(params.id)

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
        {data.recordings.map((r) => {
          const question = ALL_QUESTIONS.get(r.question_id)
          return (
            <div
              key={r.id}
              className={`bg-warm-white border border-muted/20 rounded-2xl p-4 ${r.is_free_talk ? 'border-amber/30' : ''}`}
            >
              <div className="flex items-start justify-between mb-2 gap-2">
                <p className="text-sm font-medium text-deep leading-snug flex-1">
                  <span className="text-muted font-normal">{r.question_order}번 — </span>
                  {question?.content ?? '(질문 정보 없음)'}
                </p>
                {r.is_free_talk && (
                  <span className="text-xs bg-amber text-white px-2 py-0.5 rounded-full whitespace-nowrap flex-shrink-0">
                    자유 이야기
                  </span>
                )}
              </div>

              {r.audio_url ? (
                <audio controls src={r.audio_url} className="w-full h-10 rounded-lg mt-3" />
              ) : (
                <p className="text-xs text-muted italic mt-2">녹음 파일 없음 (건너뜀)</p>
              )}

              {r.stt_text && (
                <p className="mt-3 text-xs text-mid bg-cream rounded-lg p-3 leading-relaxed">
                  &ldquo;{r.stt_text}&rdquo;
                </p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
