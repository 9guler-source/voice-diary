import { redirect } from 'next/navigation'
import { createSupabaseServer } from '@/lib/supabase-server'
import QuestionSelector from './QuestionSelector'

type Props = { searchParams: { from?: string; mode?: string } }

export default async function SelectQuestionsPage({ searchParams }: Props) {
  const supabase = await createSupabaseServer()
  const isSessionMode = searchParams.mode === 'session'

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('auth_user_id', session.user.id)
    .single()
  if (!profile) redirect('/login')

  let initialSelected: number[] = []

  if (isSessionMode) {
    // 가장 최근 세션의 selected_questions를 기본값으로 사용 (편의성)
    const { data: lastSession } = await supabase
      .from('sessions')
      .select('selected_questions')
      .eq('user_id', profile.id)
      .order('recorded_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const sq = lastSession?.selected_questions
    if (sq && sq.length > 0) {
      initialSelected = sq
        .sort((a, b) => a.order - b.order)
        .map((item) => item.question_id)
    } else {
      // 이전 세션 없으면 user_questions를 폴백으로 사용
      const { data: existing } = await supabase
        .from('user_questions')
        .select('question_id, order_num')
        .eq('user_id', profile.id)
        .order('order_num')
      initialSelected = (existing ?? []).map((e) => e.question_id)
    }
  } else {
    // 설정 모드: user_questions 참조 (기존 동작 유지)
    const { count } = await supabase
      .from('user_questions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', profile.id)

    const isReselect = searchParams.from === 'settings'
    if ((count ?? 0) >= 29 && !isReselect) redirect('/home')

    const { data: existing } = await supabase
      .from('user_questions')
      .select('question_id, order_num')
      .eq('user_id', profile.id)
      .order('order_num')

    initialSelected = (existing ?? [])
      .sort((a, b) => (a.order_num ?? 0) - (b.order_num ?? 0))
      .map((e) => e.question_id)
  }

  return (
    <QuestionSelector
      profileId={profile.id}
      initialSelected={initialSelected}
      mode={isSessionMode ? 'session' : 'settings'}
      from={searchParams.from}
    />
  )
}
