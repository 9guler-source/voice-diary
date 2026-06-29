'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { ChevronLeft, Play, Pause, StopCircle } from 'lucide-react'
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

type Props = { recordings: Recording[]; sessionDate: string }

export default function SessionPlayer({ recordings, sessionDate }: Props) {
  const [playingId, setPlayingId] = useState<string | null>(null)
  const [seqIdx, setSeqIdx] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const playAtRef = useRef<(idx: number) => void>(() => {})

  // 재생 가능(audio_url 있는) 녹음만 순서 유지
  const playable = useMemo(() => recordings.filter((r) => r.audio_url), [recordings])

  const stopSeq = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.onended = null
      audioRef.current.onerror = null
      audioRef.current.pause()
      audioRef.current = null
    }
    setPlayingId(null)
    setIsPaused(false)
    setSeqIdx(0)
  }, [])

  const playAt = useCallback(
    (idx: number) => {
      if (idx >= playable.length) { stopSeq(); return }
      const rec = playable[idx]
      setSeqIdx(idx)
      setPlayingId(rec.id)
      setIsPaused(false)

      if (audioRef.current) {
        audioRef.current.onended = null
        audioRef.current.onerror = null
        audioRef.current.pause()
      }
      const audio = new Audio(rec.audio_url!)
      audioRef.current = audio
      audio.onended = () => playAtRef.current(idx + 1)
      audio.onerror = () => playAtRef.current(idx + 1)
      audio.play().catch(() => {})
    },
    [playable, stopSeq],
  )

  // 항상 최신 playAt 참조
  useEffect(() => { playAtRef.current = playAt }, [playAt])

  // 언마운트 시 정리
  useEffect(() => () => stopSeq(), [stopSeq])

  // 재생 중인 카드로 스크롤
  useEffect(() => {
    if (playingId) {
      document.getElementById(`rec-${playingId}`)?.scrollIntoView({
        behavior: 'smooth', block: 'nearest',
      })
    }
  }, [playingId])

  const handleTogglePause = () => {
    if (!audioRef.current) return
    if (isPaused) {
      audioRef.current.play().catch(() => {})
      setIsPaused(false)
    } else {
      audioRef.current.pause()
      setIsPaused(true)
    }
  }

  const isActive = playingId !== null
  const pct = playable.length > 0
    ? Math.min(Math.round(((seqIdx + 1) / playable.length) * 100), 100)
    : 0

  return (
    <div className="px-4 pt-10 pb-8 max-w-lg mx-auto">
      <Link
        href="/records"
        className="flex items-center gap-1 text-mid text-sm mb-6 hover:text-deep"
      >
        <ChevronLeft size={16} /> 목록으로
      </Link>
      <h1 className="text-xl font-bold text-deep mb-1">녹음 세션</h1>
      <p className="text-xs text-muted mb-5">{sessionDate}</p>

      {/* ── 연속 재생 컨트롤 ── */}
      <div className="bg-warm-white border border-muted/20 rounded-2xl px-4 py-3 mb-5 space-y-3">
        <div className="flex items-center gap-2.5 flex-wrap">
          {!isActive ? (
            <button
              onClick={() => { if (playable.length) playAt(0) }}
              disabled={playable.length === 0}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber text-white text-sm font-medium hover:bg-amber-dark transition-colors disabled:opacity-40"
            >
              <Play size={15} className="fill-white" />
              전체 연속 재생
            </button>
          ) : (
            <>
              <button
                onClick={handleTogglePause}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber text-white text-sm font-medium hover:bg-amber-dark transition-colors"
              >
                {isPaused
                  ? <><Play size={15} className="fill-white" /> 재개</>
                  : <><Pause size={15} /> 일시정지</>}
              </button>
              <button
                onClick={stopSeq}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-muted/20 text-mid text-sm hover:bg-muted/30 transition-colors"
              >
                <StopCircle size={15} /> 중지
              </button>
            </>
          )}
          {playable.length === 0 && (
            <span className="text-xs text-muted">재생 가능한 녹음이 없습니다</span>
          )}
        </div>

        {isActive && (
          <>
            <div className="flex justify-between text-xs text-muted">
              <span>{isPaused ? '⏸ 일시정지' : '▶ 재생 중'}</span>
              <span>{seqIdx + 1} / {playable.length}</span>
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
                  {isPlaying && (
                    <span className="text-xs bg-amber text-white px-2 py-0.5 rounded-full">
                      {isPaused ? '⏸' : '▶ 재생 중'}
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
