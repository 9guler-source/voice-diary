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

  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })
  const password = watch('password', '')

  const onSubmit = async (data: FormData) => {
    setLoading(true)
    setError('')

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
    })
    if (authError || !authData.user) {
      setError(authError?.message ?? '회원가입에 실패했습니다.')
      setLoading(false)
      return
    }

    const { error: profileError } = await supabase
      .from('profiles')
      .insert({ auth_user_id: authData.user.id, name: data.name })

    if (profileError) {
      setError('프로필 생성에 실패했습니다. 다시 시도해 주세요.')
      setLoading(false)
      return
    }

    router.push('/home')
    setLoading(false)
  }

  return (
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
  )
}
