'use server'

import { randomUUID } from 'crypto'
import { createSupabaseServer } from '@/lib/supabase-server'

export async function createSession(
  profileId: string
): Promise<{ sessionId?: string; error?: string }> {
  // UUID를 서버에서 직접 생성 → INSERT...RETURNING 없이 INSERT만 실행
  // (sessions_family_read 정책이 auth.users를 직접 조회하므로
  //  RETURNING 절이 SELECT 정책을 평가해 permission denied 발생하는 문제 우회)
  const sessionId = randomUUID()
  const supabase = await createSupabaseServer()

  const { error } = await supabase
    .from('sessions')
    .insert({ id: sessionId, user_id: profileId, status: 'in_progress' })

  if (error) {
    console.error('[createSession] INSERT error:', error.message, error.code, error.hint)
    return { error: `${error.message} (code: ${error.code})` }
  }

  return { sessionId }
}

export async function saveRecording(recording: {
  sessionId: string
  questionId: number
  questionOrder: number
  audioUrl: string | null
  durationSec: number
  maxDecibel: number
  avgDecibel: number
  isFreeTalk: boolean
  sttText: string | null
}): Promise<{ error?: string }> {
  const supabase = await createSupabaseServer()

  // is_free_talk=true 인 경우 DB에서 실제 question_id를 조회해 FK 위반 방지
  // (코드의 FINAL_QUESTION.id가 DB serial과 다를 수 있음)
  let questionId = recording.questionId
  if (recording.isFreeTalk) {
    const { data: freeQ, error: fqErr } = await supabase
      .from('questions')
      .select('id')
      .eq('is_common', true)
      .single()
    if (fqErr || !freeQ) {
      console.error('[saveRecording] free talk question 조회 실패:', fqErr?.message)
    } else {
      questionId = freeQ.id
      console.log('[saveRecording] free talk question_id resolved:', questionId)
    }
  }

  const { error } = await supabase.from('recordings').insert({
    session_id: recording.sessionId,
    question_id: questionId,
    question_order: recording.questionOrder,
    audio_url: recording.audioUrl,
    duration_sec: recording.durationSec,
    max_decibel: recording.maxDecibel,
    avg_decibel: recording.avgDecibel,
    is_free_talk: recording.isFreeTalk,
    stt_text: recording.sttText,
  })

  if (error) {
    console.error('[saveRecording] INSERT error:', error.message, error.code, error.hint)
    return { error: error.message }
  }

  console.log('[saveRecording] saved order:', recording.questionOrder, 'free_talk:', recording.isFreeTalk, 'audio_url:', recording.audioUrl)
  return {}
}

export async function completeSession(
  sessionId: string
): Promise<{ error?: string }> {
  const supabase = await createSupabaseServer()

  const { error } = await supabase
    .from('sessions')
    .update({ status: 'completed' })
    .eq('id', sessionId)

  // sessions_family_read RLS 정책이 auth.users를 직접 조회해 UPDATE도 실패할 수 있음
  // → Supabase SQL Editor에서 003_fix_family_read_rls.sql 실행 후 해결됨
  if (error) {
    console.error('[completeSession] UPDATE error (RLS 정책 수정 필요):', error.message)
  }
  return {}
}
