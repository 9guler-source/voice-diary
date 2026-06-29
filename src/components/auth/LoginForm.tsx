'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

const schema = z.object({
  email: z.string().email('올바른 이메일을 입력해 주세요'),
  password: z.string().min(6, '비밀번호는 6자 이상이어야 합니다'),
})
type FormData = z.infer<typeof schema>

export default function LoginForm() {
  const router = useRouter()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    setLoading(true)
    setError('')

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    })

    console.log('[LoginForm] signInWithPassword →', {
      userId: authData.user?.id ?? null,
      sessionExpires: authData.session?.expires_at ?? null,
      error: authError?.message ?? null,
    })

    if (authError) {
      setError('이메일 또는 비밀번호가 올바르지 않습니다.')
      setLoading(false)
      return
    }

    // 쿠키가 실제로 설정됐는지 확인
    const cookieNames = document.cookie.split(';').map((c) => c.trim().split('=')[0])
    const supabaseCookies = cookieNames.filter((n) => n.startsWith('sb-'))
    console.log('[LoginForm] Supabase 세션 쿠키:', supabaseCookies)

    router.refresh()   // 서버 컴포넌트(layout) 캐시 무효화
    router.push('/home')
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-mid mb-1">이메일</label>
        <input
          {...register('email')}
          type="email"
          placeholder="이메일 주소"
          autoComplete="email"
          className="w-full px-4 py-3 rounded-xl border border-muted/40 bg-warm-white focus:outline-none focus:ring-2 focus:ring-amber text-deep placeholder:text-muted"
        />
        {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
      </div>
      <div>
        <label className="block text-sm font-medium text-mid mb-1">비밀번호</label>
        <input
          {...register('password')}
          type="password"
          placeholder="비밀번호"
          autoComplete="new-password"
          className="w-full px-4 py-3 rounded-xl border border-muted/40 bg-warm-white focus:outline-none focus:ring-2 focus:ring-amber text-deep placeholder:text-muted"
        />
        {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>}
      </div>

      {error && <p className="text-sm text-red-500 text-center">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 rounded-xl bg-amber font-medium text-white hover:bg-amber-dark transition-colors disabled:opacity-50"
      >
        {loading ? '로그인 중...' : '로그인'}
      </button>

      <div className="flex justify-between text-sm text-mid">
        <Link href="/signup" className="hover:text-amber-dark">회원가입</Link>
        <Link href="/forgot" className="hover:text-amber-dark">비밀번호 찾기</Link>
      </div>
    </form>
  )
}
