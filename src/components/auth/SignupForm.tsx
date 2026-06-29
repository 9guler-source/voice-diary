'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import PasswordStrength from './PasswordStrength'

const schema = z.object({
  name: z.string().min(2, '이름은 2자 이상이어야 합니다'),
  email: z.string().email('올바른 이메일을 입력해 주세요'),
  password: z.string().min(8, '비밀번호는 8자 이상이어야 합니다'),
  confirm: z.string(),
}).refine((d) => d.password === d.confirm, {
  message: '비밀번호가 일치하지 않습니다',
  path: ['confirm'],
})
type FormData = z.infer<typeof schema>

export default function SignupForm() {
  const router = useRouter()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [pendingData, setPendingData] = useState<FormData | null>(null)

  const { register, handleSubmit, watch, setFocus, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })
  const password = watch('password', '')

  // 폼 제출 시 팝업 먼저 표시
  const onSubmit = (data: FormData) => {
    setPendingData(data)
    setShowConfirm(true)
  }

  // 팝업에서 "맞습니다" → 실제 회원가입
  const handleConfirm = async () => {
    if (!pendingData) return
    setShowConfirm(false)
    setLoading(true)
    setError('')

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: pendingData.email,
      password: pendingData.password,
      options: {
        data: { name: pendingData.name },
      },
    })
    if (authError || !authData.user) {
      setError(authError?.message ?? '회원가입에 실패했습니다.')
      setLoading(false)
      return
    }

    if (!authData.session) {
      router.push('/login?notice=check-email')
      return
    }

    router.push('/home')
    setLoading(false)
  }

  // 팝업에서 "다시 입력" → 이메일 필드로 포커스
  const handleCancel = () => {
    setShowConfirm(false)
    setTimeout(() => setFocus('email'), 50)
  }

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-mid mb-1">이름</label>
          <input
            {...register('name')}
            placeholder="이름"
            className="w-full px-4 py-3 rounded-xl border border-muted/40 bg-warm-white focus:outline-none focus:ring-2 focus:ring-amber text-deep placeholder:text-muted"
          />
          {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-mid mb-1">이메일</label>
          <input
            {...register('email')}
            type="email"
            placeholder="이메일 주소"
            className="w-full px-4 py-3 rounded-xl border border-muted/40 bg-warm-white focus:outline-none focus:ring-2 focus:ring-amber text-deep placeholder:text-muted"
          />
          {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-mid mb-1">비밀번호</label>
          <input
            {...register('password')}
            type="password"
            placeholder="8자 이상"
            className="w-full px-4 py-3 rounded-xl border border-muted/40 bg-warm-white focus:outline-none focus:ring-2 focus:ring-amber text-deep placeholder:text-muted"
          />
          <PasswordStrength password={password} />
          {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-mid mb-1">비밀번호 확인</label>
          <input
            {...register('confirm')}
            type="password"
            placeholder="비밀번호 재입력"
            className="w-full px-4 py-3 rounded-xl border border-muted/40 bg-warm-white focus:outline-none focus:ring-2 focus:ring-amber text-deep placeholder:text-muted"
          />
          {errors.confirm && <p className="text-xs text-red-500 mt-1">{errors.confirm.message}</p>}
        </div>

        {error && <p className="text-sm text-red-500 text-center">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-xl bg-amber font-medium text-white hover:bg-amber-dark transition-colors disabled:opacity-50"
        >
          {loading ? '가입 중...' : '회원가입'}
        </button>

        <p className="text-sm text-center text-mid">
          이미 계정이 있으신가요?{' '}
          <Link href="/login" className="text-amber-dark hover:underline">로그인</Link>
        </p>
      </form>

      {/* 이메일 확인 팝업 */}
      {showConfirm && pendingData && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/50 backdrop-blur-sm"
        >
          <div className="w-full max-w-sm bg-warm-white rounded-2xl border-2 border-amber shadow-xl p-6 space-y-5">
            <div className="text-center space-y-2">
              <div className="text-3xl">📧</div>
              <h2 className="text-lg font-bold text-deep">이메일 주소를 확인해 주세요</h2>
              <p className="text-sm text-mid leading-relaxed">
                입력하신 이메일 주소가 맞는지 확인해 주세요.<br />
                이메일은 로그인과 비밀번호 찾기에 사용됩니다.
              </p>
            </div>

            <div className="bg-amber/10 border border-amber/30 rounded-xl px-4 py-4 text-center">
              <p className="text-xs text-muted mb-2">입력한 이메일 주소</p>
              <p className="text-base font-bold text-amber break-all">{pendingData.email}</p>
            </div>

            <p className="text-sm text-center font-medium text-deep">
              이 이메일 주소가 맞습니까?
            </p>

            <div className="space-y-2">
              <button
                onClick={handleConfirm}
                className="w-full py-3 rounded-xl bg-amber text-white font-medium hover:bg-amber-dark transition-colors"
              >
                ✅ 맞습니다 — 계속하기
              </button>
              <button
                onClick={handleCancel}
                className="w-full py-3 rounded-xl border border-muted/40 text-mid text-sm hover:bg-muted/10 transition-colors"
              >
                ✏️ 다시 입력할게요
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
