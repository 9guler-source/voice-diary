'use server'

import { createSupabaseServer } from '@/lib/supabase-server'

export async function saveSelections(
  profileId: string,
  selectedIds: number[]
): Promise<{ error?: string }> {
  const supabase = createSupabaseServer()

  // 기존 선택 삭제
  const { error: delErr } = await supabase
    .from('user_questions')
    .delete()
    .eq('user_id', profileId)

  if (delErr) return { error: `기존 선택 삭제 실패: ${delErr.message}` }

  // 새 선택 저장
  const rows = selectedIds.map((questionId, i) => ({
    user_id: profileId,
    question_id: questionId,
    order_num: i + 1,
  }))

  const { error: insErr } = await supabase.from('user_questions').insert(rows)
  if (insErr) return { error: `저장 실패: ${insErr.message}` }

  return {}
}
