'use client'

type Props = { password: string }

function getStrength(pw: string): { level: number; label: string; color: string } {
  if (pw.length === 0) return { level: 0, label: '', color: '' }
  let score = 0
  if (pw.length >= 8) score++
  if (/[A-Z]/.test(pw)) score++
  if (/[0-9]/.test(pw)) score++
  if (/[^A-Za-z0-9]/.test(pw)) score++

  if (score <= 1) return { level: 1, label: '취약', color: 'bg-red-400' }
  if (score === 2) return { level: 2, label: '보통', color: 'bg-yellow-400' }
  if (score === 3) return { level: 3, label: '양호', color: 'bg-amber' }
  return { level: 4, label: '강함', color: 'bg-sage' }
}

export default function PasswordStrength({ password }: Props) {
  const { level, label, color } = getStrength(password)
  if (!label) return null

  return (
    <div className="mt-1 space-y-1">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-all ${i <= level ? color : 'bg-muted/30'}`}
          />
        ))}
      </div>
      <p className="text-xs text-mid">비밀번호 강도: <span className="font-medium">{label}</span></p>
    </div>
  )
}
