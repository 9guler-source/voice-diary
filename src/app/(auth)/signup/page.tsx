import SignupForm from '@/components/auth/SignupForm'

export default function SignupPage() {
  return (
    <div className="min-h-screen bg-cream flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🎙️</div>
          <h1 className="text-2xl font-bold text-deep">회원가입</h1>
          <p className="text-muted text-sm mt-1">새 계정을 만들어 시작하세요</p>
        </div>
        <div className="bg-warm-white rounded-2xl p-6 shadow-sm border border-muted/20">
          <SignupForm />
        </div>
      </div>
    </div>
  )
}
