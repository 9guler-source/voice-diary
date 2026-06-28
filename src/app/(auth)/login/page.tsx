import LoginForm from '@/components/auth/LoginForm'

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-cream flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🎙️</div>
          <h1 className="text-2xl font-bold text-deep">내 목소리 일기</h1>
          <p className="text-muted text-sm mt-1">소중한 목소리와 추억을 기록하세요</p>
        </div>
        <div className="bg-warm-white rounded-2xl p-6 shadow-sm border border-muted/20">
          <LoginForm />
        </div>
      </div>
    </div>
  )
}
