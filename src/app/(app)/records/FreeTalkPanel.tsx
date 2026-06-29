'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Play, Pause, StopCircle } from 'lucide-react'
import { formatLocalDate } from '@/lib/dateUtils'

export type FreeTalkItem = {
  id: string
  session_id: string
  audio_url: string
  stt_text: string | null
  recorded_at: string
}

type Props = { items: FreeTalkItem[] }

export default function FreeTalkPanel({ items }: Props) {
  const [playingId, setPlayingId] = useState<string | null>(null)
  const [seqIdx, setSeqIdx] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [isSeq, setIsSeq] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const playAtRef = useRef<(idx: number) => void>(() => {})

  const stopAll = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.onended = null
      audioRef.current.onerror = null
      audioRef.current.pause()
      audioRef.current = null
    }
    setPlayingId(null)
    setIsPaused(false)
    setIsSeq(false)
    setSeqIdx(0)
  }, [])

  // 연속 재생 전용 — onended 시 다음으로 자동 이동
  const playAt = useCallback(
    (idx: number) => {
      if (idx >= items.length) { stopAll(); return }
      const item = items[idx]
      setSeqIdx(idx)
      setPlayingId(item.id)
      setIsPaused(false)

      if (audioRef.current) {
        audioRef.current.onended = null
        audioRef.current.onerror = null
        audioRef.current.pause()
      }
      const audio = new Audio(item.audio_url)
      audioRef.current = audio
      audio.onended = () => playAtRef.current(idx + 1)
      audio.onerror = () => playAtRef.current(idx + 1)
      audio.play().catch(() => {})
    },
    [items, stopAll],
  )

  useEffect(() => { playAtRef.current = playAt }, [playAt])
  useEffect(() => () => stopAll(), [stopAll])

  const handleStartAll = () => {
    setIsSeq(true)
    playAt(0)
  }

  // 단일 항목 재생 — 재생 완료 후 자동 정지
  const handlePlaySingle = useCallback((item: FreeTalkItem, idx: number) => {
    stopAll()
    setIsSeq(false)
    setPlayingId(item.id)
    setSeqIdx(idx)

    const audio = new Audio(item.audio_url)
    audioRef.current = audio
    audio.onended = () => {
      setPlayingId(null)
      audioRef.current = null
    }
    audio.onerror = () => {
      setPlayingId(null)
      audioRef.current = null
    }
    audio.play().catch(() => {})
  }, [stopAll])

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

  if (items.length === 0) return null

  const isActive = playingId !== null
  const pct = items.length > 0
    ? Math.min(Math.round(((seqIdx + 1) / items.length) * 100), 100)
    : 0

  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg" aria-hidden>💬</span>
        <h2 className="text-base font-bold text-deep">자유 이야기 모아듣기</h2>
        <span className="text-xs text-muted bg-muted/15 px-2 py-0.5 rounded-full">{items.length}개</span>
      </div>

      {/* ── 연속 재생 컨트롤 ── */}
      <div className="bg-warm-white border border-muted/20 rounded-2xl px-4 py-3 mb-4 space-y-3">
        <div className="flex items-center gap-2.5 flex-wrap">
          {!isActive || !isSeq ? (
            <button
              onClick={handleStartAll}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber text-white text-sm font-medium hover:bg-amber-dark transition-colors"
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
                onClick={stopAll}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-muted/20 text-mid text-sm hover:bg-muted/30 transition-colors"
              >
                <StopCircle size={15} /> 중지
              </button>
            </>
          )}
        </div>

        {isActive && isSeq && (
          <>
            <div className="flex justify-between text-xs text-muted">
              <span>{isPaused ? '⏸ 일시정지' : '▶ 재생 중'}</span>
              <span>{seqIdx + 1} / {items.length}</span>
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

      {/* ── 자유 이야기 목록 ── */}
      <div className="space-y-3">
        {items.map((item, idx) => {
          const isPlaying = item.id === playingId
          return (
            <div
              key={item.id}
              className={`border rounded-2xl p-4 transition-colors ${
                isPlaying && !isPaused
                  ? 'bg-amber/10 border-amber/50 shadow-sm'
                  : isPlaying && isPaused
                  ? 'bg-amber/5 border-amber/25'
                  : 'bg-warm-white border-amber/15'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-mid">{formatLocalDate(item.recorded_at)}</span>
                {isPlaying && (
                  <span className="text-xs bg-amber text-white px-2 py-0.5 rounded-full">
                    {isPaused ? '⏸' : '▶ 재생 중'}
                  </span>
                )}
              </div>

              {item.stt_text && (
                <p className="text-xs text-mid bg-cream rounded-lg p-3 leading-relaxed mb-3">
                  &ldquo;{item.stt_text}&rdquo;
                </p>
              )}

              <button
                onClick={() => isPlaying ? stopAll() : handlePlaySingle(item, idx)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  isPlaying
                    ? 'bg-amber/20 text-amber-dark hover:bg-amber/30'
                    : 'bg-amber/10 text-amber-dark hover:bg-amber/20'
                }`}
              >
                {isPlaying
                  ? <><StopCircle size={12} /> 중지</>
                  : <><Play size={12} className="fill-current" /> 재생</>}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
