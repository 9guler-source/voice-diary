'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useRecording } from '@/hooks/useRecording'
import { useTTS } from '@/hooks/useTTS'
import { useSTT } from '@/hooks/useSTT'
import QuestionCard from '@/components/session/QuestionCard'
import RecordingControls from '@/components/session/RecordingControls'
import SubtitlePanel from '@/components/session/SubtitlePanel'
import WaveformCanvas from '@/components/ui/WaveformCanvas'
import Toggle from '@/components/ui/Toggle'
import type { Database } from '@/lib/database.types'

type Question = Database['voice_diary']['Tables']['questions']['Row']

const FREE_TALK_LIMIT = 180

export default function SessionPage() {
  const router = useRouter()
  const [questions, setQuestions] = useState<Question[]>([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [profileId, setProfileId] = useState<string | null>(null)
  const [ttsEnabled, setTtsEnabled] = useState(true)
  const [sttEnabled, setSttEnabled] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [done, setDone] = useState(false)
  const [loading, setLoading] = useState(true)
  const [initError, setInitError] = useState('')
  const [saving, setSaving] = useState(false)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const { recording, decibel, start: startRec, stop: stopRec } = useRecording()
  const { speak, stop: stopTTS } = useTTS()
  const { transcript, interim, error: sttError, start: startSTT, stop: stopSTT } = useSTT()

  useEffect(() => {
    async function init() {
      // 세션 체크는 layout이 처리 — 여기서는 profile/questions만 확인
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('auth_user_id', session.user.id)
        .single()

      if (profileError || !profile) {
        setInitError('프로필을 찾을 수 없습니다.')
        setLoading(false)
        return
      }
      setProfileId(profile.id)

      // 사용자 선택 문항 조회
      const { data: userQs, error: uqError } = await supabase
        .from('user_questions')
        .select('question_id, order_num')
        .eq('user_id', profile.id)
        .order('order_num')

      if (uqError || !userQs || userQs.length < 29) {
        // 문항 미설정 → 선택 페이지로
        router.push('/select-questions')
        return
      }

      // 선택 문항 + 공통 문항(30번) 조회
      const questionIds = userQs.map((uq) => uq.question_id)

      const [{ data: selectedQs }, { data: commonQ }] = await Promise.all([
        supabase.from('questions').select('*').in('id', questionIds),
        supabase.from('questions').select('*').eq('is_common', true).single(),
      ])

      if (!selectedQs || selectedQs.length === 0) {
        setInitError('문항 데이터를 불러올 수 없습니다.')
        setLoading(false)
        return
      }

      // 선택 순서(order_num)대로 정렬 후 공통 문항 마지막에 추가
      const orderedQs = questionIds
        .map((id) => selectedQs.find((q) => q.id === id))
        .filter(Boolean) as Question[]

      if (commonQ) orderedQs.push(commonQ)
      setQuestions(orderedQs)

      // 새 녹음 세션 생성
      const { data: newSession, error: sessionError } = await supabase
        .from('sessions')
        .insert({ user_id: profile.id, status: 'in_progress' })
        .select('id')
        .single()

      if (sessionError || !newSession) {
        setInitError('녹음 세션을 시작할 수 없습니다. 잠시 후 다시 시도해 주세요.')
        setLoading(false)
        return
      }

      setSessionId(newSession.id)
      setLoading(false)
    }
    init()
  }, [router])

  const currentQ = questions[currentIdx]
  const isFreeTalk = currentQ?.is_common ?? false
  const total = questions.length

  // TTS: 문항 변경 시 자동 읽기
  useEffect(() => {
    if (currentQ && ttsEnabled && !recording) {
      speak(currentQ.content)
    }
  }, [currentIdx, currentQ, ttsEnabled, recording, speak])

  const handleStop = useCallback(async () => {
    if (!recording || !sessionId || !currentQ) return
    setSaving(true)
    const result = await stopRec()
    if (sttEnabled) stopSTT()

    const { data: { session } } = await supabase.auth.getSession()
    const filePath = `${profileId}/${sessionId}/${currentIdx + 1}.webm`
    let audioUrl: string | undefined

    if (session) {
      const { data } = await supabase.storage
        .from('voice-diary')
        .upload(filePath, result.blob, { contentType: 'audio/webm' })
      if (data) {
        const { data: urlData } = supabase.storage.from('voice-diary').getPublicUrl(filePath)
        audioUrl = urlData.publicUrl
      }
    }

    await supabase.from('recordings').insert({
      session_id: sessionId,
      question_id: currentQ.id,
      question_order: currentIdx + 1,
      audio_url: audioUrl ?? null,
      duration_sec: result.durationSec,
      max_decibel: result.maxDecibel,
      avg_decibel: result.avgDecibel,
      is_free_talk: isFreeTalk,
      stt_text: sttEnabled ? transcript : null,
    })

    setSaving(false)

    if (currentIdx + 1 >= total) {
      await supabase.from('sessions').update({ status: 'completed' }).eq('id', sessionId)
      setDone(true)
    } else {
      setCurrentIdx((i) => i + 1)
      setElapsed(0)
    }
  }, [recording, sessionId, currentQ, currentIdx, isFreeTalk, profileId, stopRec, sttEnabled, stopSTT, transcript, total])

  // handleStop을 ref에 보관해 타이머 interval stale closure 방지
  const handleStopRef = useRef(handleStop)
  useEffect(() => { handleStopRef.current = handleStop }, [handleStop])

  // 30번 자유 이야기 3분 타이머
  useEffect(() => {
    if (recording && isFreeTalk) {
      setElapsed(0)
      timerRef.current = setInterval(() => {
        setElapsed((prev) => {
          if (prev >= FREE_TALK_LIMIT - 1) {
            clearInterval(timerRef.current!)
            handleStopRef.current()
            return FREE_TALK_LIMIT
          }
          return prev + 1
        })
      }, 1000)
    } else {
      if (timerRef.current) clearInterval(timerRef.current)
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [recording, isFreeTalk])

  const handleStart = async () => {
    stopTTS()
    await startRec()
    if (sttEnabled) startSTT()
  }

  const handleSkip = () => {
    stopTTS()
    if (currentIdx + 1 >= total) {
      setDone(true)
    } else {
      setCurrentIdx((i) => i + 1)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted">준비 중...</p>
      </div>
    )
  }

  if (initError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-red-500 text-sm">{initError}</p>
        <button
          onClick={() => router.push('/home')}
          className="px-5 py-2.5 rounded-xl bg-amber text-white text-sm font-medium"
        >
          홈으로 돌아가기
        </button>
      </div>
    )
  }

  if (done) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 px-6 text-center">
        <div className="text-6xl">🎉</div>
        <h2 className="text-2xl font-bold text-deep">녹음 완료!</h2>
        <p className="text-mid">소중한 이야기를 남겨주셔서 감사합니다.</p>
        <button
          onClick={() => router.push('/records')}
          className="px-6 py-3 rounded-xl bg-amber text-white font-medium hover:bg-amber-dark transition-colors"
        >
          내 기록 보기
        </button>
      </div>
    )
  }

  return (
    <div className="px-4 pt-10 pb-4 space-y-5 max-w-lg mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-deep">녹음 세션</h1>
        <Toggle checked={ttsEnabled} onChange={setTtsEnabled} label="TTS" />
      </div>

      {currentQ && (
        <QuestionCard
          order={currentIdx + 1}
          total={total}
          category={currentQ.category}
          content={currentQ.content}
          isFreeTalk={isFreeTalk}
        />
      )}

      <WaveformCanvas decibel={decibel} active={recording} />

      <SubtitlePanel
        transcript={transcript}
        interim={interim}
        sttEnabled={sttEnabled}
        onToggleSTT={setSttEnabled}
        sttError={sttError}
      />

      <RecordingControls
        recording={recording}
        onStart={handleStart}
        onStop={handleStop}
        onSkip={handleSkip}
        disabled={saving}
        elapsed={isFreeTalk ? elapsed : undefined}
        timeLimit={isFreeTalk ? FREE_TALK_LIMIT : undefined}
      />

      {saving && <p className="text-center text-xs text-muted">저장 중...</p>}
    </div>
  )
}
