'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/lib/database.types'

type Question = Database['voice_diary']['Tables']['questions']['Row']

const REQUIRED = 29

// useEffect 내부에서 생성 → SSR 타이밍 문제 없이 브라우저 환경 보장
function makeClient() {
  return createBrowserClient<Database, 'voice_diary'>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { db: { schema: 'voice_diary' } }
  )
}

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
      const supabase = makeClient()

      // ── 1. 세션 확인 ──
      const { data: { session }, error: sessionErr } = await supabase.auth.getSession()
      console.log('[SelectQ] session:', session?.user?.id ?? null, sessionErr?.message)
      if (!session) { router.push('/login'); return }

      // ── 2. 프로필 조회 ──
      const { data: profile, error: profileErr } = await supabase
        .from('profiles')
        .select('id')
        .eq('auth_user_id', session.user.id)
        .single()
      console.log('[SelectQ] profile:', profile?.id ?? null, profileErr?.message)
      if (!profile) {
        setInitError(`프로필을 찾을 수 없습니다. (${profileErr?.message ?? 'unknown'})`)
        setLoading(false)
        return
      }
      profileIdRef.current = profile.id

      // ── 3. 이미 29개 선택 완료 → 홈으로 ──
      const { count, error: countErr } = await supabase
        .from('user_questions')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', profile.id)
      console.log('[SelectQ] user_questions count:', count, countErr?.message)
      if ((count ?? 0) >= REQUIRED) { router.push('/home'); return }

      // ── 4. 기존 선택 복원 ──
      const { data: existing, error: existingErr } = await supabase
        .from('user_questions')
        .select('question_id, order_num')
        .eq('user_id', profile.id)
        .order('order_num')
      console.log('[SelectQ] existing selections:', existing?.length ?? 0, existingErr?.message)
      if (existing && existing.length > 0) {
        setSelected(existing.map((e) => e.question_id))
      }

      // ── 5. 문항 목록 조회 ──
      const { data: qs, error: qsErr } = await supabase
        .from('questions')
        .select('*')
        .eq('is_common', false)
        .order('category')
        .order('order_hint')

      console.log('[SelectQ] questions:', qs?.length ?? 0, 'error:', qsErr?.message ?? null)
      if (qs && qs.length > 0) console.log('[SelectQ] sample:', qs[0])

      if (qsErr) {
        setInitError(`문항 조회 실패: ${qsErr.message}`)
        setLoading(false)
        return
      }
      if (!qs || qs.length === 0) {
        setInitError('표시할 문항이 없습니다. Supabase SQL Editor에서 마이그레이션(001번)을 실행했는지 확인해 주세요.')
        setLoading(false)
        return
      }

      setQuestions(qs)
      setLoading(false)
    }

    load().catch((err) => {
      console.error('[SelectQ] 예상치 못한 에러:', err)
      setInitError(`오류가 발생했습니다: ${String(err)}`)
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

    const supabase = makeClient()
    await supabase.from('user_questions').delete().eq('user_id', profileIdRef.current)

    const rows = selected.map((questionId, i) => ({
      user_id: profileIdRef.current!,
      question_id: questionId,
      order_num: i + 1,
    }))

    const { error } = await supabase.from('user_questions').insert(rows)
    if (error) {
      console.error('[SelectQ] save error:', error.message)
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
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-red-500 text-sm whitespace-pre-wrap">{initError}</p>
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
