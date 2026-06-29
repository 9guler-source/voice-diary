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
import { QUESTIONS, FINAL_QUESTION } from '@/lib/questions'
import type { Question } from '@/lib/questions'
import { createSession, saveRecording, completeSession } from './actions'

const FREE_TALK_LIMIT = 180

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

export default function SessionPage() {
  const router = useRouter()
  const [questions, setQuestions] = useState<Question[]>([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [profileId, setProfileId] = useState<string | null>(null)
  const [ttsEnabled, setTtsEnabled] = useState(true)
  const [ttsSubtitleEnabled, setTtsSubtitleEnabled] = useState(true)
  const [sttEnabled, setSttEnabled] = useState(false)
  const [starterTTSEnabled, setStarterTTSEnabled] = useState(true)
  const [starterPlaying, setStarterPlaying] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [done, setDone] = useState(false)
  const [loading, setLoading] = useState(true)
  const [initError, setInitError] = useState('')
  const [saving, setSaving] = useState(false)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const starterAbortRef = useRef(false)

  const { recording, decibel, start: startRec, stop: stopRec } = useRecording()
  const { speak, stop: stopTTS } = useTTS()
  const { transcript, interim, error: sttError, start: startSTT, stop: stopSTT, reset: resetSTT } = useSTT()

  // localStorage 복원 (마운트 시 한 번)
  useEffect(() => {
    setSttEnabled(localStorage.getItem('stt-enabled') === 'true')
    setTtsSubtitleEnabled(localStorage.getItem('tts-subtitle-enabled') !== 'false')
    setStarterTTSEnabled(localStorage.getItem('starter-tts-enabled') !== 'false')
  }, [])

  // localStorage 저장
  useEffect(() => { localStorage.setItem('stt-enabled', String(sttEnabled)) }, [sttEnabled])
  useEffect(() => { localStorage.setItem('tts-subtitle-enabled', String(ttsSubtitleEnabled)) }, [ttsSubtitleEnabled])
  useEffect(() => { localStorage.setItem('starter-tts-enabled', String(starterTTSEnabled)) }, [starterTTSEnabled])

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('auth_user_id', session.user.id)
        .single()

      if (profileError || !profile) {
        console.error('[SESSION] profile 오류:', profileError?.message)
        setInitError('프로필을 찾을 수 없습니다.')
        setLoading(false)
        return
      }
      setProfileId(profile.id)

      const { data: userQs, error: uqError } = await supabase
        .from('user_questions')
        .select('question_id, order_num')
        .eq('user_id', profile.id)
        .order('order_num')

      if (uqError || !userQs || userQs.length < 29) {
        router.push('/select-questions')
        return
      }

      const orderedQs = userQs
        .sort((a, b) => (a.order_num ?? 0) - (b.order_num ?? 0))
        .map((uq) => QUESTIONS.find((q) => q.id === uq.question_id))
        .filter(Boolean) as Question[]

      if (orderedQs.length === 0) {
        setInitError('문항 데이터를 불러올 수 없습니다.')
        setLoading(false)
        return
      }

      orderedQs.push(FINAL_QUESTION)
      setQuestions(orderedQs)

      const sessionResult = await createSession(profile.id)
      console.log('[SESSION] createSession result:', sessionResult)

      if (sessionResult.error || !sessionResult.sessionId) {
        setInitError(`녹음 세션을 시작할 수 없습니다: ${sessionResult.error ?? '알 수 없는 오류'}`)
        setLoading(false)
        return
      }

      setSessionId(sessionResult.sessionId)
      setLoading(false)
    }
    init()
  }, [router])

  const currentQ = questions[currentIdx]
  const isFreeTalk = currentQ?.id === FINAL_QUESTION.id
  const total = questions.length

  // TTS: 문항 변경 시 즉시 stop → 강제 대기 → speak
  // speak() 내부에서 callId로 stale utterance를 차단하므로 항상 마지막 호출만 재생됨
  useEffect(() => {
    if (!currentQ || !ttsEnabled || recording) return

    stopTTS()  // 즉시 중단 + callId 무효화

    let cancelled = false

    const run = async () => {
      // 문항 이동 후 브라우저가 완전히 정리될 시간 확보
      await sleep(600)
      if (cancelled) return

      // 새 문항 데이터는 이미 currentQ에 반영됨
      await sleep(200)
      if (cancelled) return

      void speak(currentQ.content)
    }

    void run()

    return () => {
      cancelled = true
      stopTTS()
    }
  }, [currentIdx, currentQ, ttsEnabled, recording, speak, stopTTS])

  // 문항 이동 시 STT 자막 초기화
  useEffect(() => {
    resetSTT()
  }, [currentIdx, resetSTT])

  const handleStop = useCallback(async () => {
    if (!recording || !sessionId || !currentQ) return
    stopTTS()               // 녹음 완료 시 즉시 TTS 중단
    setSaving(true)
    const result = await stopRec()
    if (sttEnabled) stopSTT()

    console.log('[SESSION] blob size:', result.blob.size, 'bytes / duration:', result.durationSec, 's')

    const filePath = `${profileId}/${sessionId}/${currentIdx + 1}.webm`
    let audioUrl: string | null = null

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('voice-diary')
      .upload(filePath, result.blob, { contentType: 'audio/webm' })

    if (uploadError) {
      console.error('[SESSION] storage upload error:', uploadError.message)
    } else if (uploadData) {
      const { data: urlData } = supabase.storage.from('voice-diary').getPublicUrl(filePath)
      audioUrl = urlData.publicUrl
      console.log('[SESSION] audioUrl saved:', audioUrl)
    }

    const { error: saveErr } = await saveRecording({
      sessionId,
      questionId: currentQ.id,
      questionOrder: currentIdx + 1,
      audioUrl,
      durationSec: result.durationSec,
      maxDecibel: result.maxDecibel,
      avgDecibel: result.avgDecibel,
      isFreeTalk,
      sttText: sttEnabled ? transcript : null,
    })
    if (saveErr) console.error('[SESSION] saveRecording error:', saveErr)

    setSaving(false)

    if (currentIdx + 1 >= total) {
      await completeSession(sessionId)
      setDone(true)
    } else {
      setCurrentIdx((i) => i + 1)
      setElapsed(0)
    }
  }, [recording, sessionId, currentQ, currentIdx, isFreeTalk, profileId, stopRec, stopTTS, sttEnabled, stopSTT, transcript, total])

  const handleStopRef = useRef(handleStop)
  useEffect(() => { handleStopRef.current = handleStop }, [handleStop])

  // 자유 이야기 3분 타이머
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
    // 시작 문구 TTS가 켜져 있고 starter가 있으면 먼저 읽고 녹음 시작
    if (starterTTSEnabled && currentQ?.starter) {
      starterAbortRef.current = false
      setStarterPlaying(true)
      await new Promise<void>((resolve) => {
        const synth = window.speechSynthesis
        if (!synth) { resolve(); return }
        const utt = new SpeechSynthesisUtterance(currentQ!.starter!)
        utt.lang = 'ko-KR'
        utt.rate = 0.9
        utt.volume = 0.85
        utt.onend = () => resolve()
        utt.onerror = () => resolve()   // 취소/에러 시에도 resolve해서 다음 단계로
        synth.speak(utt)
      })
      setStarterPlaying(false)
      if (starterAbortRef.current) return  // handleSkip이 호출된 경우 중단
    }
    await startRec()
    if (sttEnabled) startSTT()
  }

  const handleSkip = () => {
    starterAbortRef.current = true   // 진행 중인 starter TTS 중단 신호
    stopTTS()
    stopSTT()
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

      {/* TTS 자막 */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-mid">TTS 자막</span>
          <Toggle checked={ttsSubtitleEnabled} onChange={setTtsSubtitleEnabled} />
        </div>
        {ttsSubtitleEnabled && currentQ && (
          <div className="bg-amber/15 border border-amber/30 rounded-xl px-4 py-3 text-sm text-deep leading-relaxed">
            <span className="text-xs font-semibold text-amber mr-2">🔊</span>
            {currentQ.content}
          </div>
        )}
      </div>

      <WaveformCanvas decibel={decibel} active={recording} />

      {/* STT 자막 */}
      <SubtitlePanel
        transcript={transcript}
        interim={interim}
        sttEnabled={sttEnabled}
        onToggleSTT={setSttEnabled}
        sttError={sttError}
      />

      {/* 답변 시작 유도 문구 */}
      {!recording && currentQ?.starter && (
        <div className="rounded-xl bg-amber/10 border border-amber/25 px-4 py-3 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-amber">💡 이렇게 시작해 보세요</p>
            <Toggle
              checked={starterTTSEnabled}
              onChange={setStarterTTSEnabled}
              label="읽어주기"
            />
          </div>
          <p className="text-sm text-deep leading-relaxed">{currentQ.starter}</p>
          {starterPlaying && (
            <p className="text-xs text-amber animate-pulse">🎙 시작 문구 읽는 중...</p>
          )}
        </div>
      )}

      <RecordingControls
        recording={recording}
        onStart={handleStart}
        onStop={handleStop}
        onSkip={handleSkip}
        disabled={saving || starterPlaying}
        elapsed={isFreeTalk ? elapsed : undefined}
        timeLimit={isFreeTalk ? FREE_TALK_LIMIT : undefined}
      />

      {saving && <p className="text-center text-xs text-muted">저장 중...</p>}
    </div>
  )
}
