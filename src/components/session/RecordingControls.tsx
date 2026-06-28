'use client'

import { Mic, Square, SkipForward } from 'lucide-react'

type Props = {
  recording: boolean
  onStart: () => void
  onStop: () => void
  onSkip: () => void
  disabled?: boolean
  elapsed?: number
  timeLimit?: number
}

function formatTime(sec: number) {
  const m = Math.floor(sec / 60).toString().padStart(2, '0')
  const s = (sec % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

export default function RecordingControls({ recording, onStart, onStop, onSkip, disabled, elapsed = 0, timeLimit }: Props) {
  const pct = timeLimit ? Math.min((elapsed / timeLimit) * 100, 100) : null

  return (
    <div className="flex flex-col items-center gap-4">
      {timeLimit !== undefined && (
        <div className="w-full">
          <div className="flex justify-between text-xs text-muted mb-1">
            <span>{formatTime(elapsed)}</span>
            <span>{formatTime(timeLimit)}</span>
          </div>
          <div className="w-full h-1.5 bg-muted/30 rounded-full overflow-hidden">
            <div
              className="h-full bg-amber transition-all rounded-full"
              style={{ width: `${pct ?? 0}%` }}
            />
          </div>
        </div>
      )}

      <div className="flex items-center gap-6">
        <button
          onClick={onSkip}
          disabled={disabled || recording}
          className="flex flex-col items-center gap-1 text-muted hover:text-mid disabled:opacity-30 transition-colors"
        >
          <SkipForward size={24} />
          <span className="text-xs">건너뛰기</span>
        </button>

        <button
          onClick={recording ? onStop : onStart}
          disabled={disabled}
          className={`w-20 h-20 rounded-full flex items-center justify-center shadow-lg transition-all disabled:opacity-40 ${
            recording
              ? 'bg-red-500 hover:bg-red-600 scale-110'
              : 'bg-amber hover:bg-amber-dark'
          }`}
        >
          {recording
            ? <Square size={28} className="text-white fill-white" />
            : <Mic size={28} className="text-white" />
          }
        </button>

        <div className="w-16" />
      </div>

      <p className="text-xs text-muted">
        {recording ? '녹음 중 — 버튼을 눌러 완료' : '버튼을 눌러 녹음 시작'}
      </p>
    </div>
  )
}
