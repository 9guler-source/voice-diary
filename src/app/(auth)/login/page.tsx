import LoginForm from '@/components/auth/LoginForm'

type Props = {
  searchParams: { notice?: string }
}

export default function LoginPage({ searchParams }: Props) {
  const emailNotice = searchParams.notice === 'check-email'

  return (
    <div className="min-h-screen bg-cream flex flex-col items-center">
      <div className="flex-1 flex items-center justify-center w-full px-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="text-5xl mb-4">🎙️</div>
            <h1 className="text-3xl font-bold text-deep tracking-tight">기억을 꼭 붙잡아!! 🤬💢</h1>
            <p className="text-amber-dark font-medium italic mt-1.5">찬란했던 나의 이야기</p>
            <div className="mt-3 space-y-1 text-xs text-muted/80 leading-relaxed">
              <p>기억이 흐려지기 전에, 지금 목소리로 남겨두세요.</p>
              <p>가물가물할 때 꼭 들어보세요 — 당신의 목소리가 기억을 깨웁니다.</p>
            </div>
          </div>

          {emailNotice && (
            <div className="mb-4 bg-sage/10 border border-sage/30 rounded-xl px-4 py-3 text-sm text-sage text-center">
              ✉️ 가입 확인 이메일을 보냈습니다. 이메일을 확인하고 링크를 클릭한 후 로그인해 주세요.
            </div>
          )}

          <div className="bg-warm-white rounded-2xl p-6 shadow-sm border border-muted/20">
            <LoginForm />
          </div>
        </div>
      </div>

      <footer className="py-4 text-center w-full">
        <p className="text-xs text-muted/50">© 2026 Young Sohk Song (宋映錫 · 송영석). All rights reserved.</p>
      </footer>
    </div>
  )
}
