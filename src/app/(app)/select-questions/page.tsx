'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

interface Question {
  id: number
  category: string
  content: string
  is_common: boolean
  order_hint: number | null
}

const REQUIRED = 29

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ??
  'https://sfeyfxojkyjdbwpkvcdm.supabase.co'
const SUPABASE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmZXlmeG9qa3lqZGJ3cGt2Y2RtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyMDYwMDEsImV4cCI6MjA5Njc4MjAwMX0.WQe4cQlEOnmi3euW9QSc_iVjk63wTNnr8-6JioEOvts'

export default function SelectQuestionsPage() {
  const router = useRouter()
  const profileIdRef = useRef<string | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [selected, setSelected] = useState<number[]>([])
  const [loading, setLoading] = useState(true)
  const [initError, setInitError] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  useEffect(() => {
    async function load() {
      // ── 세션 확인 ──
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }

      // ── 프로필 조회 ──
      const { data: profile, error: profileErr } = await supabase
        .from('profiles')
        .select('id')
        .eq('auth_user_id', session.user.id)
        .single()

      if (!profile) {
        setInitError(`프로필 없음: ${profileErr?.message ?? 'unknown'}`)
        setLoading(false)
        return
      }
      profileIdRef.current = profile.id

      // ── 이미 29개 선택 완료 → 홈으로 ──
      const { count } = await supabase
        .from('user_questions')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', profile.id)
      if ((count ?? 0) >= REQUIRED) { router.push('/home'); return }

      // ── 기존 선택 복원 ──
      const { data: existing } = await supabase
        .from('user_questions')
        .select('question_id, order_num')
        .eq('user_id', profile.id)
        .order('order_num')
      if (existing?.length) setSelected(existing.map((e) => e.question_id))

      // ── 문항 조회 (Accept-Profile: voice_diary 로 스키마 직접 지정) ──
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/questions?is_common=eq.false&order=category,order_hint`,
        {
          headers: {
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${SUPABASE_KEY}`,
            'Accept-Profile': 'voice_diary',
          },
        }
      )
      const data: Question[] = await res.json()
      console.log('[SelectQ] questions:', data?.length, 'status:', res.status)

      if (!res.ok) {
        setInitError(`문항 조회 실패 (${res.status}): ${JSON.stringify(data)}`)
        setLoading(false)
        return
      }
      if (!Array.isArray(data) || data.length === 0) {
        setInitError(
          `문항 없음 (status ${res.status})\n` +
          `Supabase SQL Editor에서 마이그레이션 001번의 INSERT 구문을 실행해 주세요.`
        )
        setLoading(false)
        return
      }

      setQuestions(data)
      setLoading(false)
    }

    load().catch((err: unknown) => {
      console.error('[SelectQ]:', err)
      setInitError(String(err))
      setLoading(false)
    })
  }, [router])

  const toggle = (id: number) => {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id)
      if (prev.length >= REQUIRED) return prev
      return [...prev, id]
    })
  }

  const handleSave = async () => {
    if (selected.length !== REQUIRED || !profileIdRef.current) return
    setSaving(true)
    setSaveError('')

    await supabase.from('user_questions').delete().eq('user_id', profileIdRef.current)

    const rows = selected.map((questionId, i) => ({
      user_id: profileIdRef.current!,
      question_id: questionId,
      order_num: i + 1,
    }))

    const { error } = await supabase.from('user_questions').insert(rows)
    if (error) {
      setSaveError(`저장 실패: ${error.message}`)
      setSaving(false)
      return
    }

    router.push('/home')
  }

  const grouped = questions.reduce<Record<string, Question[]>>((acc, q) => {
    if (!acc[q.category]) acc[q.category] = []
    acc[q.category].push(q)
    return acc
  }, {})

  // ── 로딩 ──
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted text-sm">문항을 불러오는 중...</p>
      </div>
    )
  }

  // ── 에러 ──
  if (initError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6 py-10">
        <p className="text-red-500 text-sm font-medium text-center">오류가 발생했습니다</p>
        <pre className="w-full bg-gray-900 text-green-400 rounded-xl p-4 text-xs overflow-auto whitespace-pre-wrap break-all max-h-80">
          {initError}
        </pre>
        <button
          onClick={() => window.location.reload()}
          className="px-5 py-2.5 rounded-xl bg-amber text-white text-sm font-medium"
        >
          다시 시도
        </button>
      </div>
    )
  }

  return (
    <div className="px-4 pt-10 pb-32">
      <div className="mb-4">
        <h1 className="text-xl font-bold text-deep">나의 문항 선택</h1>
        <p className="text-sm text-muted mt-1">
          녹음할 {REQUIRED}개 문항을 선택해 주세요. 30번 문항(자유 이야기)은 자동으로 포함됩니다.
        </p>
      </div>

      {/* 고정 상단 바 */}
      <div className="sticky top-0 z-10 bg-cream pt-2 pb-3">
        <div className="flex items-center justify-between bg-warm-white border border-muted/20 rounded-2xl px-4 py-3 shadow-sm">
          <div>
            <span className="text-sm text-mid">선택됨 </span>
            <span className={`text-lg font-bold ${selected.length === REQUIRED ? 'text-sage' : 'text-amber'}`}>
              {selected.length}
            </span>
            <span className="text-sm text-muted"> / {REQUIRED}</span>
          </div>
          <button
            onClick={handleSave}
            disabled={selected.length !== REQUIRED || saving}
            className="px-5 py-2 rounded-xl bg-amber text-white text-sm font-semibold hover:bg-amber-dark transition-colors disabled:opacity-40"
          >
            {saving ? '저장 중...' : '완료'}
          </button>
        </div>
        {saveError && <p className="text-xs text-red-500 text-center mt-1">{saveError}</p>}
        {selected.length >= REQUIRED && (
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
              const isDisabled = !isSelected && selected.length >= REQUIRED

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
