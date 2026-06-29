'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { ChevronLeft, Mic, Pause, Play, StopCircle, Volume2 } from 'lucide-react'
import { QUESTIONS, FINAL_QUESTION } from '@/lib/questions'

const ALL_Q = new Map([...QUESTIONS, FINAL_QUESTION].map((q) => [q.id, q]))

export type Recording = {
  id: string
  question_id: number
  question_order: number
  audio_url: string | null
  duration_sec: number | null
  stt_text: string | null
  is_free_talk: boolean
}

type PlayMode = 'none' | 'answers' | 'together'
type TogStep = 'q' | 'a'

type Props = { recordings: Recording[]; sessionDate: string; questionCount?: number }

export default function SessionPlayer({ recordings, sessionDate, questionCount }: Props) {
  // ── 공통 상태 ──────────────────────────────────────────────────
  const [mode, setMode] = useState<PlayMode>('none')
  const [playingId, setPlayingId] = useState<string | null>(null)
  const [isPaused, setIsPaused] = useState(false)
  const [volume, setVolume] = useState(80)
  const volumeRef = useRef(80)
  useEffect(() => { volumeRef.current = volume }, [volume])

  // ── 답변만 재생 상태 ───────────────────────────────────────────
  const [answIdx, setAnswIdx] = useState(0)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const answPlayAtRef = useRef<(idx: number) => void>(() => {})

  // ── 함께 듣기 상태 ────────────────────────────────────────────
  const [togIdx, setTogIdx] = useState(0)
  const [togStep, setTogStep] = useState<TogStep>('q')
  const togAudioRef = useRef<HTMLAudioElement | null>(null)
  const togPlayAtRef = useRef<(idx: number) => void>(() => {})

  const playable = useMemo(() => recordings.filter((r) => r.audio_url), [recordings])

  // ── 전체 정지 ─────────────────────────────────────────────────
  const stopAll = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.speechSynthesis?.pause()
      window.speechSynthesis?.cancel()
    }
    const killAudio = (ref: React.MutableRefObject<HTMLAudioElement | null>) => {
      if (ref.current) {
        ref.current.onended = null
        ref.current.onerror = null
        ref.current.pause()
        ref.current = null
      }
    }
    killAudio(audioRef)
    killAudio(togAudioRef)

    setMode('none')
    setPlayingId(null)
    setIsPaused(false)
    setAnswIdx(0)
    setTogIdx(0)
    setTogStep('q')
  }, [])

  // ── 답변만 재생 ───────────────────────────────────────────────
  const answPlayAt = useCallback((idx: number) => {
    if (idx >= playable.length) { stopAll(); return }
    const rec = playable[idx]
    setAnswIdx(idx)
    setPlayingId(rec.id)
    setIsPaused(false)

    if (audioRef.current) {
      audioRef.current.onended = null
      audioRef.current.onerror = null
      audioRef.current.pause()
    }
    const audio = new Audio(rec.audio_url!)
    audio.volume = volumeRef.current / 100
    audioRef.current = audio
    audio.onended = () => answPlayAtRef.current(idx + 1)
    audio.onerror = () => answPlayAtRef.current(idx + 1)
    audio.play().catch(() => {})
  }, [playable, stopAll])

  useEffect(() => { answPlayAtRef.current = answPlayAt }, [answPlayAt])

  // ── 함께 듣기 재생 ────────────────────────────────────────────
  const togPlayAt = useCallback((idx: number) => {
    if (idx >= recordings.length) { stopAll(); return }
    const rec = recordings[idx]

    setTogIdx(idx)
    setPlayingId(rec.id)
    setTogStep('q')
    setIsPaused(false)

    window.speechSynthesis?.cancel()

    const qText = ALL_Q.get(rec.question_id)?.content ?? ''

    const afterTTS = () => {
      if (!rec.audio_url) {
        togPlayAtRef.current(idx + 1)
        return
      }
      setTogStep('a')
      if (togAudioRef.current) {
        togAudioRef.current.onended = null
        togAudioRef.current.onerror = null
        togAudioRef.current.pause()
      }
      const audio = new Audio(rec.audio_url)
      audio.volume = volumeRef.current / 100
      togAudioRef.current = audio
      audio.onended = () => togPlayAtRef.current(idx + 1)
      audio.onerror = () => togPlayAtRef.current(idx + 1)
      audio.play().catch(() => togPlayAtRef.current(idx + 1))
    }

    if (!qText) { afterTTS(); return }

    const utt = new SpeechSynthesisUtterance(qText)
    utt.lang = 'ko-KR'
    utt.rate = 0.85
    utt.volume = volumeRef.current / 100
    utt.onend = afterTTS
    utt.onerror = () => togPlayAtRef.current(idx + 1)
    window.speechSynthesis?.speak(utt)
  }, [recordings, stopAll])

  useEffect(() => { togPlayAtRef.current = togPlayAt }, [togPlayAt])

  // ── 언마운트 정리 ─────────────────────────────────────────────
  useEffect(() => () => stopAll(), [stopAll])

  // ── 재생 카드로 스크롤 ─────────────────────────────────────────
  useEffect(() => {
    if (playingId) {
      document.getElementById(`rec-${playingId}`)?.scrollIntoView({
        behavior: 'smooth', block: 'nearest',
      })
    }
  }, [playingId])

  // ── 일시정지 / 재개 ───────────────────────────────────────────
  const handleTogglePause = () => {
    if (mode === 'answers') {
      if (!audioRef.current) return
      if (isPaused) {
        audioRef.current.play().catch(() => {})
        setIsPaused(false)
      } else {
        audioRef.current.pause()
        setIsPaused(true)
      }
    } else if (mode === 'together') {
      if (isPaused) {
        if (togStep === 'q') window.speechSynthesis?.resume()
        else togAudioRef.current?.play().catch(() => {})
        setIsPaused(false)
      } else {
        if (togStep === 'q') window.speechSynthesis?.pause()
        else togAudioRef.current?.pause()
        setIsPaused(true)
      }
    }
  }

  // ── 볼륨 ─────────────────────────────────────────────────────
  const handleVolumeChange = (val: number) => {
    setVolume(val)
    if (audioRef.current) audioRef.current.volume = val / 100
    if (togAudioRef.current) togAudioRef.current.volume = val / 100
    // TTS 볼륨은 다음 utterance 생성 시 volumeRef를 통해 적용됨
  }

  // ── 파생 표시값 ───────────────────────────────────────────────
  const isActive = mode !== 'none'
  const playingOrder = playingId
    ? (recordings.find((r) => r.id === playingId)?.question_order ?? 0)
    : 0

  let statusLabel = ''
  let currentNum = 1
  let totalNum = 1
  let pct = 0

  if (mode === 'answers') {
    statusLabel = isPaused ? '일시정지' : `${playingOrder}번 답변 듣는 중`
    currentNum = answIdx + 1
    totalNum = playable.length
    pct = Math.min(Math.round(((answIdx + 1) / playable.length) * 100), 100)
  } else if (mode === 'together') {
    if (isPaused) statusLabel = '일시정지'
    else if (togStep === 'q') statusLabel = `${playingOrder}번 질문 읽는 중...`
    else statusLabel = `${playingOrder}번 답변 듣는 중`
    currentNum = togIdx + 1
    totalNum = recordings.length
    pct = Math.min(
      Math.round(((togIdx + (togStep === 'a' ? 0.5 : 0)) / recordings.length) * 100),
      100,
    )
  }

  return (
    <div className="px-4 pt-10 pb-8 max-w-lg mx-auto">
      <Link
        href="/records"
        className="flex items-center gap-1 text-mid text-sm mb-6 hover:text-deep"
      >
        <ChevronLeft size={16} /> 목록으로
      </Link>
      <h1 className="text-xl font-bold text-deep mb-1">녹음 세션</h1>
      <p className="text-xs text-muted mb-1">{sessionDate}</p>
      {questionCount !== undefined && (
        <p className="text-xs text-muted mb-5">{questionCount}개 문항 · {recordings.length}개 녹음</p>
      )}

      {/* ── 재생 컨트롤 패널 ── */}
      <div className="bg-warm-white border border-muted/20 rounded-2xl px-4 py-3 mb-5 space-y-3">
        {!isActive ? (
          /* 대기 중 */
          <div className="flex flex-wrap gap-2.5">
            <button
              onClick={() => { setMode('answers'); answPlayAt(0) }}
              disabled={playable.length === 0}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber text-white text-sm font-medium hover:bg-amber-dark transition-colors disabled:opacity-40"
            >
              <Play size={15} className="fill-white" />
              전체 연속 재생
            </button>
            <button
              onClick={() => { setMode('together'); togPlayAt(0) }}
              disabled={recordings.length === 0}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-amber text-amber-dark text-sm font-medium hover:bg-amber/10 transition-colors disabled:opacity-40"
            >
              <Mic size={15} />
              문항+답변 함께 듣기
            </button>
            {playable.length === 0 && (
              <p className="text-xs text-muted w-full">재생 가능한 녹음이 없습니다</p>
            )}
          </div>
        ) : (
          /* 재생 중 */
          <>
            <div className="flex items-center gap-2.5 flex-wrap">
              <button
                onClick={handleTogglePause}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber text-white text-sm font-medium hover:bg-amber-dark transition-colors"
              >
                {isPaused
                  ? <><Play size={15} className="fill-white" /> 재개</>
                  : <><Pause size={15} /> 일시정지</>}
              </button>
              <button
                onClick={stopAll}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-muted/20 text-mid text-sm hover:bg-muted/30 transition-colors"
              >
                <StopCircle size={15} /> 중지
              </button>
              {/* 볼륨 슬라이더 */}
              <label className="flex items-center gap-1.5 ml-auto text-muted">
                <Volume2 size={14} />
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={volume}
                  onChange={(e) => handleVolumeChange(Number(e.target.value))}
                  className="w-20 accent-amber cursor-pointer"
                />
                <span className="text-xs w-7 tabular-nums">{volume}</span>
              </label>
            </div>

            {/* 상태 + 진행 */}
            <div className="flex justify-between text-xs text-muted">
              <span className="flex items-center gap-1">
                {mode === 'together' && <Mic size={11} />}
                {isPaused ? '⏸ ' : ''}{statusLabel}
              </span>
              <span className="tabular-nums">{currentNum} / {totalNum}</span>
            </div>
            <div className="w-full h-2 bg-muted/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber rounded-full transition-[width] duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
          </>
        )}
      </div>

      {/* ── 녹음 목록 ── */}
      <div className="space-y-4">
        {recordings.map((r) => {
          const question = ALL_Q.get(r.question_id)
          const isPlaying = r.id === playingId

          let badge: string | null = null
          if (isPlaying && !isPaused) {
            badge = mode === 'together' && togStep === 'q' ? '🔊 질문 읽는 중' : '▶ 답변 듣는 중'
          } else if (isPlaying && isPaused) {
            badge = '⏸'
          }

          return (
            <div
              key={r.id}
              id={`rec-${r.id}`}
              className={`border rounded-2xl p-4 transition-colors ${
                isPlaying && !isPaused
                  ? 'bg-amber/10 border-amber/50 shadow-sm'
                  : isPlaying && isPaused
                  ? 'bg-amber/5 border-amber/25'
                  : r.is_free_talk
                  ? 'bg-warm-white border-amber/20'
                  : 'bg-warm-white border-muted/20'
              }`}
            >
              <div className="flex items-start justify-between mb-2 gap-2">
                <p className="text-sm font-medium text-deep leading-snug flex-1">
                  <span className={`font-normal ${isPlaying ? 'text-amber' : 'text-muted'}`}>
                    {r.question_order}번 —{' '}
                  </span>
                  {question?.content ?? '(질문 정보 없음)'}
                </p>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {badge && (
                    <span className="text-xs bg-amber text-white px-2 py-0.5 rounded-full whitespace-nowrap">
                      {badge}
                    </span>
                  )}
                  {r.is_free_talk && !isPlaying && (
                    <span className="text-xs bg-amber/15 text-amber-dark px-2 py-0.5 rounded-full">
                      자유 이야기
                    </span>
                  )}
                </div>
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
