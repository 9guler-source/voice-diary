'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { LogOut, Plus, Trash2 } from 'lucide-react'
import type { Database } from '@/lib/database.types'

type Guardian = Database['voice_diary']['Tables']['guardians']['Row']

const pwSchema = z.object({
  current: z.string().min(1, '현재 비밀번호를 입력해 주세요'),
  next: z.string().min(8, '8자 이상이어야 합니다'),
  confirm: z.string(),
}).refine((d) => d.next === d.confirm, { message: '비밀번호가 일치하지 않습니다', path: ['confirm'] })
type PwData = z.infer<typeof pwSchema>

const guardianSchema = z.object({
  name: z.string().min(1, '이름을 입력해 주세요'),
  email: z.string().email('올바른 이메일'),
  relation: z.string().optional(),
})
type GuardianData = z.infer<typeof guardianSchema>

export default function SettingsPage() {
  const router = useRouter()
  const [profileId, setProfileId] = useState<string | null>(null)
  const [guardians, setGuardians] = useState<Guardian[]>([])
  const [pwMsg, setPwMsg] = useState('')
  const [guardianMsg, setGuardianMsg] = useState('')

  const pwForm = useForm<PwData>({ resolver: zodResolver(pwSchema) })
  const guardianForm = useForm<GuardianData>({ resolver: zodResolver(guardianSchema) })

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('auth_user_id', session.user.id)
        .single()

      if (!profile) return
      setProfileId(profile.id)

      const { data: gs } = await supabase
        .from('guardians')
        .select('*')
        .eq('user_id', profile.id)
      setGuardians(gs ?? [])
    }
    load()
  }, [router])

  const onChangePw = async (data: PwData) => {
    const { error } = await supabase.auth.updateUser({ password: data.next })
    if (error) {
      setPwMsg('비밀번호 변경에 실패했습니다.')
    } else {
      setPwMsg('비밀번호가 변경되었습니다.')
      pwForm.reset()
    }
  }

  const onAddGuardian = async (data: GuardianData) => {
    if (!profileId) return
    const { data: newG, error } = await supabase
      .from('guardians')
      .insert({ user_id: profileId, name: data.name, email: data.email, relation: data.relation ?? null })
      .select()
      .single()
    if (error) {
      setGuardianMsg('추가에 실패했습니다.')
    } else if (newG) {
      setGuardians((prev) => [...prev, newG])
      guardianForm.reset()
      setGuardianMsg('')
    }
  }

  const onDeleteGuardian = async (id: string) => {
    await supabase.from('guardians').delete().eq('id', id)
    setGuardians((prev) => prev.filter((g) => g.id !== id))
  }

  const onLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="px-4 pt-12 pb-4 space-y-6">
      <h1 className="text-2xl font-bold text-deep">설정</h1>

      <section className="bg-warm-white border border-muted/20 rounded-2xl p-5 space-y-4">
        <h2 className="font-semibold text-deep">비밀번호 변경</h2>
        <form onSubmit={pwForm.handleSubmit(onChangePw)} className="space-y-3">
          {(['current', 'next', 'confirm'] as const).map((field) => (
            <div key={field}>
              <input
                {...pwForm.register(field)}
                type="password"
                placeholder={field === 'current' ? '현재 비밀번호' : field === 'next' ? '새 비밀번호' : '새 비밀번호 확인'}
                className="w-full px-4 py-3 rounded-xl border border-muted/40 bg-cream focus:outline-none focus:ring-2 focus:ring-amber text-deep placeholder:text-muted text-sm"
              />
              {pwForm.formState.errors[field] && (
                <p className="text-xs text-red-500 mt-0.5">{pwForm.formState.errors[field]?.message}</p>
              )}
            </div>
          ))}
          {pwMsg && <p className="text-sm text-sage">{pwMsg}</p>}
          <button
            type="submit"
            className="w-full py-2.5 rounded-xl bg-amber text-white text-sm font-medium hover:bg-amber-dark transition-colors"
          >
            변경하기
          </button>
        </form>
      </section>

      <section className="bg-warm-white border border-muted/20 rounded-2xl p-5 space-y-4">
        <h2 className="font-semibold text-deep">가족(보호자) 관리</h2>
        <p className="text-xs text-muted">등록된 가족은 내 녹음을 들을 수 있습니다.</p>

        {guardians.map((g) => (
          <div key={g.id} className="flex items-center justify-between bg-cream rounded-xl px-4 py-3">
            <div>
              <p className="text-sm font-medium text-deep">{g.name} {g.relation && `(${g.relation})`}</p>
              <p className="text-xs text-muted">{g.email}</p>
            </div>
            <button
              onClick={() => onDeleteGuardian(g.id)}
              className="text-muted hover:text-red-500 transition-colors"
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}

        <form onSubmit={guardianForm.handleSubmit(onAddGuardian)} className="space-y-2">
          <input
            {...guardianForm.register('name')}
            placeholder="이름"
            className="w-full px-4 py-2.5 rounded-xl border border-muted/40 bg-cream text-sm focus:outline-none focus:ring-2 focus:ring-amber text-deep placeholder:text-muted"
          />
          <input
            {...guardianForm.register('email')}
            type="email"
            placeholder="이메일"
            className="w-full px-4 py-2.5 rounded-xl border border-muted/40 bg-cream text-sm focus:outline-none focus:ring-2 focus:ring-amber text-deep placeholder:text-muted"
          />
          <input
            {...guardianForm.register('relation')}
            placeholder="관계 (예: 딸, 아들)"
            className="w-full px-4 py-2.5 rounded-xl border border-muted/40 bg-cream text-sm focus:outline-none focus:ring-2 focus:ring-amber text-deep placeholder:text-muted"
          />
          {guardianMsg && <p className="text-xs text-red-500">{guardianMsg}</p>}
          <button
            type="submit"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sage text-white text-sm font-medium hover:bg-sage/80 transition-colors"
          >
            <Plus size={16} /> 가족 추가
          </button>
        </form>
      </section>

      <button
        onClick={onLogout}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-muted/30 text-mid text-sm hover:bg-muted/10 transition-colors"
      >
        <LogOut size={16} /> 로그아웃
      </button>
    </div>
  )
}
