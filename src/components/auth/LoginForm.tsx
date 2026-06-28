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
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    })
    if (authError) {
      setError('이메일 또는 비밀번호가 올바르지 않습니다.')
    } else {
      router.push('/home')
    }
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
