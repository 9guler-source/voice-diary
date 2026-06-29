'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { saveSelections } from './actions'
import { QUESTIONS, FINAL_QUESTION } from '@/lib/questions'
import type { Question } from '@/lib/questions'

interface Props {
  profileId: string
  initialSelected: number[]
  mode: 'session' | 'settings'
  from?: string
}

const SETTINGS_REQUIRED = 29
const SESSION_MAX = 30

export default function QuestionSelector({ profileId, initialSelected, mode, from }: Props) {
  const router = useRouter()
  const [selected, setSelected] = useState<number[]>(initialSelected)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  const isSession = mode === 'session'
  const maxCount = isSession ? SESSION_MAX : SETTINGS_REQUIRED

  // 세션 모드에는 자유 이야기 문항도 포함
  const allQuestions: Question[] = isSession ? [...QUESTIONS, FINAL_QUESTION] : QUESTIONS

  const toggle = (id: number) => {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id)
      if (prev.length >= maxCount) return prev
      return [...prev, id]
    })
  }

  const handleSave = async () => {
    if (isSession) {
      if (selected.length < 1) return
      // sessionStorage에 저장하고 세션 페이지로 이동
      sessionStorage.setItem('voice-diary:session-questions', JSON.stringify(selected))
      router.push('/session')
      return
    }

    // 설정 모드: user_questions에 저장
    if (selected.length !== SETTINGS_REQUIRED) return
    setSaving(true)
    setSaveError('')

    const result = await saveSelections(profileId, selected)
    if (result.error) {
      setSaveError(result.error)
      setSaving(false)
      return
    }

    router.push(from === 'settings' ? '/settings' : '/home')
  }

  const grouped = allQuestions.reduce<Record<string, Question[]>>((acc, q) => {
    if (!acc[q.category]) acc[q.category] = []
    acc[q.category].push(q)
    return acc
  }, {})

  const canStart = isSession ? selected.length >= 1 : selected.length === SETTINGS_REQUIRED
  const btnLabel = isSession
    ? (saving ? '이동 중...' : `${selected.length}개 문항으로 녹음 시작 →`)
    : (saving ? '저장 중...' : '완료')

  return (
    <div className="px-4 pt-10 pb-32">
      <div className="mb-4">
        <h1 className="text-xl font-bold text-deep">
          {isSession ? '이번 녹음의 문항 선택' : '나의 문항 선택'}
        </h1>
        <p className="text-sm text-muted mt-1">
          {isSession
            ? '이번 녹음에서 답할 문항을 선택하세요. 자유 이야기도 선택할 수 있어요.'
            : `녹음할 ${SETTINGS_REQUIRED}개 문항을 선택해 주세요.`}
        </p>
      </div>

      {/* 고정 상단 바 */}
      <div className="sticky top-0 z-10 bg-cream pt-2 pb-3">
        <div className="flex items-center justify-between bg-warm-white border border-muted/20 rounded-2xl px-4 py-3 shadow-sm">
          <div>
            <span className="text-sm text-mid">선택됨 </span>
            <span className={`text-lg font-bold ${canStart ? 'text-sage' : 'text-amber'}`}>
              {selected.length}
            </span>
            {isSession ? (
              <span className="text-sm text-muted"> / {SESSION_MAX} (최소 1개)</span>
            ) : (
              <span className="text-sm text-muted"> / {SETTINGS_REQUIRED}</span>
            )}
          </div>
          <button
            onClick={handleSave}
            disabled={!canStart || saving}
            className="px-5 py-2 rounded-xl bg-amber text-white text-sm font-semibold hover:bg-amber-dark transition-colors disabled:opacity-40"
          >
            {btnLabel}
          </button>
        </div>
        {saveError && <p className="text-xs text-red-500 text-center mt-1">{saveError}</p>}
        {isSession && selected.length > 0 && (
          <p className="text-xs text-sage text-center mt-1">
            {selected.length}개 선택됨 — 완료 버튼을 눌러 녹음을 시작하세요.
          </p>
        )}
        {!isSession && selected.length >= SETTINGS_REQUIRED && (
          <p className="text-xs text-sage text-center mt-1">29개 선택 완료! 완료 버튼을 눌러주세요.</p>
        )}
      </div>

      {/* 카테고리별 문항 목록 */}
      {Object.entries(grouped).map(([category, qs]) => (
        <div key={category} className="mb-6">
          <h2 className="text-xs font-semibold text-muted uppercase tracking-wide mb-2 px-1">
            {category}
          </h2>
          <div className="space-y-2">
            {qs.map((q) => {
              const isSelected = selected.includes(q.id)
              const orderNum = selected.indexOf(q.id) + 1
              const isDisabled = !isSelected && selected.length >= maxCount

              return (
                <button
                  key={q.id}
                  onClick={() => toggle(q.id)}
                  disabled={isDisabled}
                  className={`w-full text-left px-4 py-3 rounded-xl border transition-all ${
                    isSelected
                      ? 'bg-amber/10 border-amber/40'
                      : 'bg-warm-white border-muted/20'
                  } ${isDisabled ? 'opacity-35 cursor-not-allowed' : 'active:scale-[0.99]'}`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center text-xs font-bold ${
                      isSelected
                        ? 'bg-amber border-amber text-white'
                        : 'border-muted/40 text-transparent'
                    }`}>
                      {isSelected ? orderNum : ''}
                    </div>
                    <span className={`text-sm leading-snug ${isSelected ? 'text-deep font-medium' : 'text-mid'}`}>
                      {q.content}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
