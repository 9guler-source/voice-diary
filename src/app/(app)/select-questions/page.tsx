import { redirect } from 'next/navigation'
import { createSupabaseServer } from '@/lib/supabase-server'
import QuestionSelector from './QuestionSelector'
import type { Database } from '@/lib/database.types'

type Question = Database['voice_diary']['Tables']['questions']['Row']

export default async function SelectQuestionsPage() {
  const supabase = createSupabaseServer()

  // ── 인증 확인 ──
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  // ── 프로필 조회 ──
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('auth_user_id', session.user.id)
    .single()
  if (!profile) redirect('/login')

  // ── 이미 29개 선택 완료 → 홈으로 ──
  const { count } = await supabase
    .from('user_questions')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', profile.id)
  if ((count ?? 0) >= 29) redirect('/home')

  // ── 기존 선택 복원 ──
  const { data: existing } = await supabase
    .from('user_questions')
    .select('question_id, order_num')
    .eq('user_id', profile.id)
    .order('order_num')

  // ── 문항 조회 (서버에서 voice_diary 스키마 직접 접근) ──
  const { data: questions, error } = await supabase
    .from('questions')
    .select('*')
    .eq('is_common', false)
    .order('category')
    .order('order_hint')

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center gap-3">
        <p className="text-red-500 text-sm font-medium">문항 조회 오류</p>
        <pre className="bg-gray-900 text-green-400 rounded-xl p-4 text-xs whitespace-pre-wrap break-all max-w-sm">
          {error.message}
        </pre>
      </div>
    )
  }

  if (!questions || questions.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center gap-3">
        <p className="text-red-500 text-sm font-medium">문항이 없습니다</p>
        <p className="text-muted text-xs leading-relaxed">
          Supabase SQL Editor에서<br />
          마이그레이션 001번의 INSERT 구문을 실행해 주세요.
        </p>
        <pre className="bg-gray-900 text-green-400 rounded-xl p-3 text-xs text-left max-w-sm whitespace-pre-wrap break-all">
          {`SELECT count(*)\nFROM voice_diary.questions;`}
        </pre>
      </div>
    )
  }

  const initialSelected = (existing ?? [])
    .sort((a, b) => (a.order_num ?? 0) - (b.order_num ?? 0))
    .map((e) => e.question_id)

  return (
    <QuestionSelector
      questions={questions as Question[]}
      profileId={profile.id}
      initialSelected={initialSelected}
    />
  )
}
