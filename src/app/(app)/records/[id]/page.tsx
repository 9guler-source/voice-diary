import { createSupabaseServer } from '@/lib/supabase-server'
import Link from 'next/link'
import SessionPlayer from './SessionPlayer'
import type { Recording } from './SessionPlayer'

type Props = { params: { id: string } }

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

  return {
    session,
    recordings: (recordings ?? []) as Recording[],
  }
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
    <SessionPlayer
      recordings={data.recordings}
      sessionDate={formatDate(data.session.recorded_at)}
    />
  )
}
