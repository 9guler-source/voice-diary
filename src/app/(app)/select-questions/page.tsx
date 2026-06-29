import { redirect } from 'next/navigation'
import { createSupabaseServer } from '@/lib/supabase-server'
import QuestionSelector from './QuestionSelector'

type Props = { searchParams: { from?: string } }

export default async function SelectQuestionsPage({ searchParams }: Props) {
  const supabase = await createSupabaseServer()

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('auth_user_id', session.user.id)
    .single()
  if (!profile) redirect('/login')

  const { count } = await supabase
    .from('user_questions')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', profile.id)

  // 설정에서 재선택하는 경우에는 이미 29개여도 통과
  const isReselect = searchParams.from === 'settings'
  if ((count ?? 0) >= 29 && !isReselect) redirect('/home')

  const { data: existing } = await supabase
    .from('user_questions')
    .select('question_id, order_num')
    .eq('user_id', profile.id)
    .order('order_num')

  const initialSelected = (existing ?? [])
    .sort((a, b) => (a.order_num ?? 0) - (b.order_num ?? 0))
    .map((e) => e.question_id)

  return (
    <QuestionSelector
      profileId={profile.id}
      initialSelected={initialSelected}
      from={searchParams.from}
    />
  )
}
