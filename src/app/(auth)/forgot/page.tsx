'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

const schema = z.object({
  email: z.string().email('올바른 이메일을 입력해 주세요'),
})
type FormData = z.infer<typeof schema>

export default function ForgotPage() {
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    setLoading(true)
    setError('')
    setStep(2)
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(data.email, {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/reset-password`,
    })
    if (resetError) {
      setError('이메일 전송에 실패했습니다.')
      setStep(1)
    } else {
      setStep(3)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-deep">비밀번호 찾기</h1>
        </div>
        <div className="bg-warm-white rounded-2xl p-6 shadow-sm border border-muted/20">
          {step === 1 && (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <p className="text-sm text-mid">가입한 이메일 주소를 입력하시면 재설정 링크를 보내드립니다.</p>
              <div>
                <input
                  {...register('email')}
                  type="email"
                  placeholder="이메일 주소"
                  className="w-full px-4 py-3 rounded-xl border border-muted/40 bg-cream focus:outline-none focus:ring-2 focus:ring-amber text-deep placeholder:text-muted"
                />
                {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-amber font-medium text-white hover:bg-amber-dark transition-colors disabled:opacity-50"
              >
                재설정 링크 보내기
              </button>
            </form>
          )}

          {step === 2 && (
            <div className="text-center space-y-3">
              <div className="text-4xl">⏳</div>
              <p className="text-mid">이메일을 전송 중입니다...</p>
            </div>
          )}

          {step === 3 && (
            <div className="text-center space-y-4">
              <div className="text-4xl">✉️</div>
              <h2 className="font-semibold text-deep">이메일을 확인해 주세요</h2>
              <p className="text-sm text-mid">비밀번호 재설정 링크를 보내드렸습니다. 이메일을 확인하고 링크를 클릭해 주세요.</p>
              <Link href="/login" className="block text-sm text-amber-dark hover:underline">
                로그인으로 돌아가기
              </Link>
            </div>
          )}

          {step !== 3 && (
            <p className="text-sm text-center text-mid mt-4">
              <Link href="/login" className="hover:underline">로그인으로 돌아가기</Link>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
