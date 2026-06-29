import SignupForm from '@/components/auth/SignupForm'

export default function SignupPage() {
  return (
    <div className="min-h-screen bg-cream flex flex-col items-center">
      <div className="flex-1 flex items-center justify-center w-full px-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="text-5xl mb-3">🎙️</div>
            <p className="text-xs font-medium text-amber-dark mb-1">기억을 붙잡아</p>
            <h1 className="text-2xl font-bold text-deep">회원가입</h1>
            <p className="text-muted text-sm mt-1">새 계정을 만들어 시작하세요</p>
          </div>
          <div className="bg-warm-white rounded-2xl p-6 shadow-sm border border-muted/20">
            <SignupForm />
          </div>
        </div>
      </div>

      <footer className="py-4 text-center w-full">
        <p className="text-xs text-muted/50">© 2026 Young Sohk Song (宋映錫 · 송영석). All rights reserved.</p>
      </footer>
    </div>
  )
}
