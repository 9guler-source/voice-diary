'use server'

import { createSupabaseServer } from '@/lib/supabase-server'

export async function createSession(
  profileId: string
): Promise<{ sessionId?: string; error?: string }> {
  const supabase = await createSupabaseServer()

  const { data, error } = await supabase
    .from('sessions')
    .insert({ user_id: profileId, status: 'in_progress' })
    .select('id')
    .single()

  if (error || !data) {
    return { error: error?.message ?? '세션 생성 실패' }
  }
  return { sessionId: data.id }
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

  const { error } = await supabase.from('recordings').insert({
    session_id: recording.sessionId,
    question_id: recording.questionId,
    question_order: recording.questionOrder,
    audio_url: recording.audioUrl,
    duration_sec: recording.durationSec,
    max_decibel: recording.maxDecibel,
    avg_decibel: recording.avgDecibel,
    is_free_talk: recording.isFreeTalk,
    stt_text: recording.sttText,
  })

  if (error) return { error: error.message }
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

  if (error) return { error: error.message }
  return {}
}
